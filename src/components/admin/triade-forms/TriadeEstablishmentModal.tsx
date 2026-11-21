import React from 'react';
import { createPortal } from 'react-dom';
import { TriadeEstablishmentMasterForm, EstablishmentMasterPayload } from './TriadeEstablishmentMasterForm';
import { AdminSalonItem } from '../../../types/admin';

interface TriadeEstablishmentModalProps {
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

  const handleSuccess = async (payload: EstablishmentMasterPayload, createdSalon?: AdminSalonItem) => {
    const cleanSlug = String(createdSalon?.slug || payload?.slug || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

    onClose();

    if (createdSalon) {
      if (onViewDetails) {
        onViewDetails(createdSalon);
      }
      if (onSuccess) {
        onSuccess(payload);
      }
      if (cleanSlug && typeof document !== 'undefined') {
        const link = document.createElement('a');
        link.href = `https://${cleanSlug}.vagouapp.com`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      return;
    }

    if (onCreate) {
      try {
        const result = await onCreate({
          trade_name: payload.tradeName,
          legal_name: payload.legalName,
          slug: payload.slug,
          phone_whatsapp: payload.ownerWhatsapp,
          email: payload.ownerEmail,
          document_type: payload.documentType,
          document_number: payload.documentNumber,
          category: payload.category as any,
          status: 'active',
          is_verified: true,
          address: payload.address.street,
          street_number: payload.address.number,
          complement: payload.address.complement,
          neighborhood: payload.address.neighborhood,
          city: payload.address.city,
          state: payload.address.state,
          cep: payload.address.cep,
          logo_url: payload.logoUrl,
          favicon_url: payload.faviconUrl,
          slogan: payload.slogan,
          brand_font: payload.brandFont,
          primary_color: payload.primaryColor,
        });

        if (result?.salon && onViewDetails) {
          onViewDetails(result.salon);
        }
      } catch (err) {
        console.error('Erro ao persistir salão:', err);
      }
    }

    if (onSuccess) {
      onSuccess(payload);
    }

    if (cleanSlug && typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = `https://${cleanSlug}.vagouapp.com`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] overflow-y-auto">
        <TriadeEstablishmentMasterForm
          onSuccess={handleSuccess}
          onClose={onClose}
        />
      </div>
    </div>,
    document.body
  );
};
