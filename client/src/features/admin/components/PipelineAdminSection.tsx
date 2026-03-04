import { useState } from 'react'
import { Plus, ChevronUp, ChevronDown, Pencil, Check, X } from 'lucide-react'
import {
  usePipelines,
  useCreatePipeline,
  useUpdatePipeline,
  useCreateBucket,
  useUpdateBucket,
  useReorderBuckets,
} from '@/hooks/useLeads'

export default function PipelineAdminSection() {
  const { data: pipelinesResponse } = usePipelines()
  const createPipeline = useCreatePipeline()
  const updatePipeline = useUpdatePipeline()
  const createBucket = useCreateBucket()
  const updateBucket = useUpdateBucket()
  const reorderBuckets = useReorderBuckets()

  const pipelines = pipelinesResponse?.data ?? []

  const [newPipelineName, setNewPipelineName] = useState('')
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null)
  const [editingPipelineName, setEditingPipelineName] = useState('')
  const [newBucketName, setNewBucketName] = useState<Record<string, string>>({})
  const [editingBucketId, setEditingBucketId] = useState<string | null>(null)
  const [editingBucketName, setEditingBucketName] = useState('')

  const handleCreatePipeline = () => {
    if (!newPipelineName.trim()) return
    createPipeline.mutate({ name: newPipelineName.trim() })
    setNewPipelineName('')
  }

  const handleSavePipelineName = (id: string) => {
    if (!editingPipelineName.trim()) return
    updatePipeline.mutate({ id, name: editingPipelineName.trim() })
    setEditingPipelineId(null)
  }

  const handleCreateBucket = (pipelineId: string) => {
    const name = newBucketName[pipelineId]?.trim()
    if (!name) return
    const pipeline = pipelines.find((p) => p.id === pipelineId)
    createBucket.mutate({ pipelineId, name, position: pipeline?.buckets.length ?? 0 })
    setNewBucketName((prev) => ({ ...prev, [pipelineId]: '' }))
  }

  const handleSaveBucketName = (pipelineId: string, bucketId: string) => {
    if (!editingBucketName.trim()) return
    updateBucket.mutate({ pipelineId, bucketId, name: editingBucketName.trim() })
    setEditingBucketId(null)
  }

  const handleMoveBucket = (pipelineId: string, bucketId: string, direction: 'up' | 'down') => {
    const pipeline = pipelines.find((p) => p.id === pipelineId)
    if (!pipeline) return
    const sorted = [...pipeline.buckets].sort((a, b) => a.position - b.position)
    const idx = sorted.findIndex((b) => b.id === bucketId)
    if (direction === 'up' && idx > 0) {
      const ids = sorted.map((b) => b.id)
      ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
      reorderBuckets.mutate({ pipelineId, bucketIds: ids })
    } else if (direction === 'down' && idx < sorted.length - 1) {
      const ids = sorted.map((b) => b.id)
      ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
      reorderBuckets.mutate({ pipelineId, bucketIds: ids })
    }
  }

  return (
    <div className="space-y-4">
      {/* Neue Pipeline erstellen */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newPipelineName}
          onChange={(e) => setNewPipelineName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreatePipeline()}
          placeholder="Neue Pipeline erstellen..."
          className="flex-1 px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-blue-400/50"
        />
        <button
          type="button"
          onClick={handleCreatePipeline}
          disabled={!newPipelineName.trim()}
          className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold disabled:opacity-30"
        >
          <Plus size={12} strokeWidth={2} />
          Pipeline
        </button>
      </div>

      {/* Pipelines List */}
      {pipelines.map((pipeline) => {
        const sortedBuckets = [...pipeline.buckets].sort((a, b) => a.position - b.position)
        return (
          <div
            key={pipeline.id}
            className="glass-card p-4"
          >
            {/* Pipeline Header */}
            <div className="flex items-center gap-2 mb-3">
              {editingPipelineId === pipeline.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editingPipelineName}
                    onChange={(e) => setEditingPipelineName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSavePipelineName(pipeline.id)}
                    className="flex-1 px-2.5 py-1 text-[13px] font-bold rounded-lg bg-bg border border-border text-text focus:outline-none focus:border-blue-400/50"
                    autoFocus
                  />
                  <button type="button" onClick={() => handleSavePipelineName(pipeline.id)} className="text-emerald-400 hover:text-emerald-300">
                    <Check size={14} strokeWidth={2} />
                  </button>
                  <button type="button" onClick={() => setEditingPipelineId(null)} className="text-text-dim hover:text-text">
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-[13px] font-bold flex-1">{pipeline.name}</span>
                  <button
                    type="button"
                    onClick={() => { setEditingPipelineId(pipeline.id); setEditingPipelineName(pipeline.name) }}
                    className="text-text-dim hover:text-text p-1"
                  >
                    <Pencil size={12} strokeWidth={2} />
                  </button>
                </>
              )}
            </div>

            {/* Buckets */}
            <div className="space-y-1.5 ml-2">
              {sortedBuckets.map((bucket, idx) => (
                <div
                  key={bucket.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg group"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <span className="text-[10px] font-bold text-text-dim w-5 text-center shrink-0">{idx + 1}</span>
                  {editingBucketId === bucket.id ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="text"
                        value={editingBucketName}
                        onChange={(e) => setEditingBucketName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveBucketName(pipeline.id, bucket.id)}
                        className="flex-1 px-2 py-0.5 text-[12px] rounded bg-bg border border-border text-text focus:outline-none focus:border-blue-400/50"
                        autoFocus
                      />
                      <button type="button" onClick={() => handleSaveBucketName(pipeline.id, bucket.id)} className="text-emerald-400">
                        <Check size={12} strokeWidth={2} />
                      </button>
                      <button type="button" onClick={() => setEditingBucketId(null)} className="text-text-dim">
                        <X size={12} strokeWidth={2} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-[12px] text-text-sec flex-1">{bucket.name}</span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => { setEditingBucketId(bucket.id); setEditingBucketName(bucket.name) }}
                          className="text-text-dim hover:text-text p-0.5"
                        >
                          <Pencil size={10} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveBucket(pipeline.id, bucket.id, 'up')}
                          disabled={idx === 0}
                          className="text-text-dim hover:text-text p-0.5 disabled:opacity-20"
                        >
                          <ChevronUp size={12} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveBucket(pipeline.id, bucket.id, 'down')}
                          disabled={idx === sortedBuckets.length - 1}
                          className="text-text-dim hover:text-text p-0.5 disabled:opacity-20"
                        >
                          <ChevronDown size={12} strokeWidth={2} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add Bucket */}
            <div className="flex items-center gap-2 mt-2 ml-2">
              <input
                type="text"
                value={newBucketName[pipeline.id] ?? ''}
                onChange={(e) => setNewBucketName((prev) => ({ ...prev, [pipeline.id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateBucket(pipeline.id)}
                placeholder="Neue Stufe..."
                className="flex-1 px-2.5 py-1.5 text-[11px] rounded-lg bg-bg border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-blue-400/50"
              />
              <button
                type="button"
                onClick={() => handleCreateBucket(pipeline.id)}
                disabled={!(newBucketName[pipeline.id]?.trim())}
                className="text-blue-400 hover:text-blue-300 p-1 disabled:opacity-30"
              >
                <Plus size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
