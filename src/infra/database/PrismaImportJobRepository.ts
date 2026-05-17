// src/infra/database/PrismaImportJobRepository.ts
// Gerencia o ciclo de vida dos jobs de importação: PENDING → RUNNING → SUCCESS/FAILED

import { PrismaClient } from '@prisma/client'

export type JobStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED'
export type JobSource = 'SINAPI' | 'SEINFRA'
export type JobTableType = 'ONERADA' | 'DESONERADA'

export interface CreateJobDTO {
  source: JobSource
  state: string
  month: number
  year: number
  type: JobTableType
}

export interface UpdateJobDTO {
  status: JobStatus
  itemsCount?: number
  logs?: string
}

export class PrismaImportJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateJobDTO) {
    return this.prisma.importJob.create({
      data: {
        source: data.source,
        state: data.state,
        month: data.month,
        year: data.year,
        type: data.type,
        status: 'PENDING',
      },
    })
  }

  async markAsRunning(jobId: string) {
    return this.prisma.importJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING' },
    })
  }

  async markAsSuccess(jobId: string, itemsCount: number, logs: string) {
    return this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'SUCCESS',
        itemsCount,
        logs,
        finishedAt: new Date(),
      },
    })
  }

  async markAsFailed(jobId: string, errorMessage: string) {
    return this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        logs: errorMessage,
        finishedAt: new Date(),
      },
    })
  }

  async findById(jobId: string) {
    return this.prisma.importJob.findUnique({
      where: { id: jobId },
    })
  }

  async listRecent(limit = 10) {
    return this.prisma.importJob.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    })
  }
}
