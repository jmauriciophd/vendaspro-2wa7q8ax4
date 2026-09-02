/**
 * Camada de abstração de Filas e Tarefas em Segundo Plano (Queue-Ready).
 * Projetada com interface compatível com BullMQ / Celery / SQS.
 * Executa de forma resiliente e desacoplada.
 */

export interface QueueJob<T = any> {
  id: string
  name: string
  data: T
  attempts: number
  maxAttempts: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: number
}

class QueueService {
  private handlers = new Map<string, (data: any) => Promise<any>>()
  private queue: QueueJob[] = []

  /**
   * Registra um processador de fila para um tipo de tarefa
   */
  registerWorker<T = any>(jobName: string, handler: (data: T) => Promise<any>) {
    this.handlers.set(jobName, handler)
  }

  /**
   * Adiciona um trabalho à fila
   */
  async add<T = any>(jobName: string, data: T, maxAttempts: number = 3): Promise<string> {
    const jobId = 'job_' + Math.random().toString(36).substring(2, 11)
    const job: QueueJob<T> = {
      id: jobId,
      name: jobName,
      data,
      attempts: 0,
      maxAttempts,
      status: 'pending',
      createdAt: Date.now(),
    }

    this.queue.push(job)
    // Dispara processamento em background sem travar UI
    setTimeout(() => this.processNext(), 0)
    return jobId
  }

  private async processNext() {
    const job = this.queue.find((j) => j.status === 'pending')
    if (!job) return

    job.status = 'processing'
    job.attempts += 1

    const handler = this.handlers.get(job.name)
    if (!handler) {
      job.status = 'failed'
      return
    }

    try {
      await handler(job.data)
      job.status = 'completed'
    } catch (err) {
      if (job.attempts < job.maxAttempts) {
        job.status = 'pending'
      } else {
        job.status = 'failed'
      }
    }

    // Processa próximo
    setTimeout(() => this.processNext(), 50)
  }
}

export const queueService = new QueueService()
