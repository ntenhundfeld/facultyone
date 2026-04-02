import React from 'react';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import {
  DeleteConfirmationCategory,
  setDeleteConfirmationPreference,
  shouldSkipDeleteConfirmation,
} from '../services/persistence';

interface DeleteConfirmationRequest {
  category: DeleteConfirmationCategory;
  confirmCategoryLabel: string;
  itemName: string;
  itemType: string;
  requireTyping?: boolean;
  onConfirm: () => void;
}

export const useDeleteConfirmation = () => {
  const [request, setRequest] = React.useState<DeleteConfirmationRequest | null>(null);

  const requestDelete = React.useCallback((nextRequest: DeleteConfirmationRequest) => {
    if (shouldSkipDeleteConfirmation(nextRequest.category)) {
      nextRequest.onConfirm();
      return;
    }

    setRequest(nextRequest);
  }, []);

  const handleClose = React.useCallback(() => {
    setRequest(null);
  }, []);

  const modal = request ? (
    <DeleteConfirmationModal
      isOpen
      onClose={handleClose}
      onConfirm={request.onConfirm}
      onConfirmPreferenceChange={(dontAskAgain) => {
        if (dontAskAgain) {
          setDeleteConfirmationPreference(request.category, true);
        }
      }}
      itemName={request.itemName}
      itemType={request.itemType}
      confirmCategoryLabel={request.confirmCategoryLabel}
      requireTyping={request.requireTyping}
    />
  ) : null;

  return {
    requestDelete,
    deleteConfirmationModal: modal,
  };
};
