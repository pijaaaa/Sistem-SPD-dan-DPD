export const formatCurrencyInput = (val) => {
  if (!val && val !== 0) return '';
  const num = parseFloat(String(val).replace(/[^0-9]/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('id-ID');
};

export const parseCurrencyInput = (val) => {
  if (!val) return '';
  const num = parseFloat(String(val).replace(/[^0-9]/g, ''));
  return isNaN(num) ? '' : num.toString();
};

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
};
