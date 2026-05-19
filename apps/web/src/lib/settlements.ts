import api from './api';

export function saveSettlementPdfBlob(blob: Blob, statementNumber: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `settlement_${statementNumber.replace(/[^\w.-]+/g, '_')}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadSettlementPdf(settlementId: string, statementNumber: string) {
  const res = await api.get(`/settlements/${settlementId}/pdf/download`, {
    responseType: 'blob',
  });
  saveSettlementPdfBlob(res.data, statementNumber || settlementId);
}
