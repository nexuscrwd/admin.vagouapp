import React from 'react';
import { createPortal } from 'react-dom';
import { TriadeEstablishmentMasterForm, EstablishmentMasterPayload } from './TriadeEstablishmentMasterForm';
import { AdminSalonItem } from '../../../types/admin';

export interface TriadeEstablishmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate?: (salon: Partial<AdminSalonItem>) => Promise<any>;
  onSuccess?: (payload: EstablishmentMasterPayload) => void;
  onViewDetails?: (salon: AdminSalonItem) => void;
}

export const TriadeEstablishmentModal: React.FC<TriadeEstablishmentModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  onSuccess,
  onViewDetails,
}) => {
  if (!isOpen) return null;

  const handleSuccess = async (payload: EstablishmentMasterPayload) => {
    if (onCreate) {
      try {
        const result = await onCreate({
          trade_name: payload.tradeName,
          legal_name: payload.legalName,
          slug: payload.slug,
          phone: payload.ownerWhatsapp,
          email: payload.ownerEmail,
          cnpj_cpf: payload.documentNumber,
          category: payload.category,
          status: 'pending',
          is_verified: false,
          address_street: payload.address.street,
          address_number: payload.address.number,
          address_neighborhood: payload.address.neighborhood,
          address_city: payload.address.city,
          address_state: payload.address.state,
          address_zip: payload.address.cep,
          primary_color: payload.primaryColor,
        });

        if (result && onViewDetails) {
          onViewDetails(result);
        }
      } catch (err) {
        console.error('Erro ao persistir salão:', err);
      }
    }

    if (onSuccess) {
      onSuccess(payload);
    }

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <TriadeEstablishmentMasterForm
        onSuccess={handleSuccess}
        onClose={onClose}
      />
    </div>,
    document.body
  );
};
