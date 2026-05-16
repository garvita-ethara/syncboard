import React from 'react';
import Modal from './Modal';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
  tone = 'danger'
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      action={(
        <>
          <button className="ghost" type="button" onClick={onClose}>{cancelLabel}</button>
          <button className={tone === 'danger' ? 'primary destructive' : 'primary'} type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      )}
    >
      <div className="confirm-copy">
        <p>{message}</p>
      </div>
    </Modal>
  );
}
