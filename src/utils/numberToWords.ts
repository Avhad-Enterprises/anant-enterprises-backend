/**
 * Convert number to words (Indian Numbering System)
 * Handles Rupees and Paise
 */
export const numberToWords = (amount: number): string => {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  const convertChunk = (num: number): string => {
    if (num === 0) return '';
    if (num < 10) return units[num];
    if (num < 20) return teens[num - 10];
    if (num < 100)
      return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + units[num % 10] : '');
    if (num < 1000)
      return (
        units[Math.floor(num / 100)] +
        ' Hundred' +
        (num % 100 !== 0 ? ' ' + convertChunk(num % 100) : '')
      );
    return '';
  };

  if (amount === 0) return 'Zero Rupees';

  const roundedAmount = Math.round(amount * 100) / 100;
  const rupees = Math.floor(roundedAmount);
  const paise = Math.round((roundedAmount - rupees) * 100);

  let words = '';

  if (rupees > 0) {
    // Indian System: Crore, Lakh, Thousand, Hundred
    const crore = Math.floor(rupees / 10000000);
    let remainder = rupees % 10000000;
    const lakh = Math.floor(remainder / 100000);
    remainder = remainder % 100000;
    const thousand = Math.floor(remainder / 1000);
    remainder = remainder % 1000;

    if (crore > 0) words += convertChunk(crore) + ' Crore ';
    if (lakh > 0) words += convertChunk(lakh) + ' Lakh ';
    if (thousand > 0) words += convertChunk(thousand) + ' Thousand ';
    if (remainder > 0) words += convertChunk(remainder);

    words = words.trim() + ' Rupees';
  }

  if (paise > 0) {
    if (words !== '') words += ' and ';
    words += convertChunk(paise) + ' Paise';
  }

  return words + ' Only';
};
