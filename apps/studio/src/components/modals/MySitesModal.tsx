'use client';

import { Modal, ModalHeader, ModalBody, Button } from '@plugspace/ui';
import { PencilRuler, CloudUpload, X } from 'lucide-react';

interface MySitesModalProps {
  onClose: () => void;
}

export default function MySitesModal({ onClose }: MySitesModalProps) {
  const drafts = [
    { id: '1', name: 'E-commerce Store', lastEdited: '2 hours ago', color: 'purple' },
    { id: '2', name: 'Portfolio Site', lastEdited: '1 day ago', color: 'blue' },
  ];

  const published = [
    { id: '3', name: 'Fashion Hub', lastEdited: '3 days ago', status: 'Live', color: 'green' },
  ];

  return (
    <Modal open={true} onClose={onClose} size="xl">
      <ModalHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">My Projects</h2>
            <p className="text-sm text-[#94a3b8] mt-1">Manage your saved designs...</p>
          </div>
          <Button variant="indigo">
            + New Project
          </Button>
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-6">
          {/* Unfinished Drafts */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <PencilRuler className="w-5 h-5 text-[#94a3b8]" />
              <h3 className="font-semibold text-white">Unfinished Drafts</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="p-4 bg-[#1e293b] border border-slate-700 rounded-lg hover:border-blue-500 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded bg-${draft.color}-600 flex items-center justify-center text-white font-bold`}>
                      {draft.name[0]}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{draft.name}</h4>
                      <p className="text-xs text-[#94a3b8]">{draft.lastEdited}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Resume Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Saved & Published */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CloudUpload className="w-5 h-5 text-[#94a3b8]" />
              <h3 className="font-semibold text-white">Saved & Published</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {published.map((project) => (
                <div
                  key={project.id}
                  className="p-4 bg-[#1e293b] border border-green-500/30 bg-green-50/5 rounded-lg hover:border-green-500 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded bg-${project.color}-600 flex items-center justify-center text-white font-bold`}>
                      {project.name[0]}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{project.name}</h4>
                      <p className="text-xs text-[#94a3b8]">{project.lastEdited}</p>
                    </div>
                    <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                      {project.status}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Open Editor
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
