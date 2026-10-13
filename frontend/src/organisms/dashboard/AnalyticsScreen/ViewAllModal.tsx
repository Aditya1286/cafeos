import React from 'react';
import Modal from '@/molecules/Modal';
import { RankedList } from './charts';
import type { ViewAllRequest } from './SlotRenderer';

/** A ranked list in full. It scrolls inside the dialog, which the owner opened, never on the page behind. */
export const ViewAllModal: React.FC<{ request: ViewAllRequest; onClose: () => void }> = ({
  request,
  onClose,
}) => (
  <Modal title={request.title} onClose={onClose} maxWidth="max-w-3xl">
    <div className="max-h-[65vh] overflow-y-auto">
      <RankedList
        result={request.result}
        primary={request.primary}
        columns={request.columns}
        showAll
      />
    </div>
  </Modal>
);
