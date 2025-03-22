import React from 'react';
import { Dialog } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const DeleteQuizModal = ({ isOpen, onClose, onConfirm, title, isLoading }) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white">
          <div className="p-4 sm:p-6">
            <div className="flex items-center">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3 text-center">
              <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                Delete Quiz
              </Dialog.Title>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete "{title}"? This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 rounded-b-lg">
            <button
              type="button"
              className={`inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default DeleteQuizModal;
