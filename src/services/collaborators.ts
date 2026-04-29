import pb from '@/lib/pocketbase/client'
import type { Collaborator } from '@/lib/types'

export const getCollaborators = () =>
  pb.collection('colaboradores').getFullList<Collaborator>({ sort: '-created' })

export const createCollaborator = (data: Partial<Collaborator>) =>
  pb.collection('colaboradores').create<Collaborator>(data)

export const updateCollaborator = (id: string, data: Partial<Collaborator>) =>
  pb.collection('colaboradores').update<Collaborator>(id, data)

export const deleteCollaborator = (id: string) => pb.collection('colaboradores').delete(id)
