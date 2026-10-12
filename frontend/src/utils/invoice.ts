// Everything the printable invoice needs, independent of where the order came from: the customer
// tracking page (public order + business) and the owner's e-bill (staff bill) both map into
// InvoiceData, so the printed layout is built once.

export interface InvoiceLine {
  name: string;
  variantName?: string;
  quantity: number;
  unitPricePaise: number;
  amountPaise: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string | Date;
  /** gstin is optional: it prints on the invoice only for a business that has one on file. */
  seller: { name: string; address?: string; phone?: string; gstin?: string };
  buyer: { name: string; phone?: string };
  table?: string;
  lines: InvoiceLine[];
  subtotalPaise: number;
  discountPaise: number;
  serviceChargePaise: number;
  taxPaise: number;
  /** GST rate the business charges; 0 means no GST was charged on this bill. */
  taxRatePercentage: number;
  totalAmountPaise: number;
  payment: { method?: string; status?: string; transactionId?: string };
}

/** SAC code for services by restaurants, cafés and similar eating places (incl. takeaway). */
export const RESTAURANT_SAC = '996331';

const toLines = (items: any[] = []): InvoiceLine[] =>
  items.map((it) => {
    const quantity = it.quantity || 1;
    const amountPaise = it.itemTotalPaise ?? (it.pricePaise || 0) * quantity;
    return {
      name: it.name,
      variantName: it.variantName || undefined,
      quantity,
      unitPricePaise: it.pricePaise ?? Math.round(amountPaise / quantity),
      amountPaise,
    };
  });

const cleanTxn = (id?: string) => (id && id !== 'N/A' ? id : undefined);

/** From the customer's tracking page: the public order and its curated business object. */
export const invoiceFromOrder = (order: any, business: any): InvoiceData => ({
  invoiceNumber: order.orderId || order.orderNumber,
  date: order.createdAt,
  seller: {
    name: business?.name || '',
    address: business?.address,
    phone: business?.phone,
    gstin: business?.gstin || undefined,
  },
  buyer: { name: order.customerName || 'Guest', phone: order.customerPhone },
  table: order.tableName,
  lines: toLines(order.items),
  subtotalPaise: order.subtotalPaise || 0,
  discountPaise: order.discountPaise || 0,
  serviceChargePaise: order.serviceChargePaise || 0,
  taxPaise: order.taxPaise || 0,
  taxRatePercentage: business?.taxRatePercentage ?? 0,
  totalAmountPaise: order.totalAmountPaise || 0,
  payment: {
    method: order.paymentMethod,
    status: order.paymentStatus,
    transactionId: cleanTxn(order.transactionId),
  },
});

/** From the owner's e-bill (GET /orders/:id/bill). */
export const invoiceFromBill = (bill: any): InvoiceData => ({
  invoiceNumber: bill.billNumber || bill.orderId,
  date: bill.date,
  seller: {
    name: bill.business?.name || '',
    address: bill.business?.address,
    phone: bill.business?.phone,
    gstin: bill.business?.gstin || undefined,
  },
  buyer: { name: bill.customer?.name || 'Guest', phone: bill.customer?.phone },
  table: bill.table,
  lines: toLines(bill.items),
  subtotalPaise: bill.subtotalPaise || 0,
  discountPaise: bill.discountPaise || 0,
  serviceChargePaise: bill.serviceChargePaise || 0,
  taxPaise: bill.taxPaise || 0,
  taxRatePercentage: bill.business?.taxRatePercentage ?? 0,
  totalAmountPaise: bill.totalAmountPaise || 0,
  payment: {
    method: bill.paymentMethod,
    status: bill.paymentStatus,
    transactionId: cleanTxn(bill.transactionId),
  },
});

/** Within one state GST is split equally into CGST and SGST; any odd paisa goes to SGST so the two always add up to the tax. */
export const splitGst = (taxPaise: number) => {
  const cgstPaise = Math.floor(taxPaise / 2);
  return { cgstPaise, sgstPaise: taxPaise - cgstPaise };
};

/** What's left between the listed charges and the total (rounding), so the printed lines always add up. */
export const roundOffPaise = (inv: InvoiceData): number =>
  inv.totalAmountPaise -
  (inv.subtotalPaise - inv.discountPaise + inv.serviceChargePaise + inv.taxPaise);

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
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
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const belowHundred = (n: number) =>
  n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]} ${ONES[n % 10]}`.trim();

const belowThousand = (n: number) =>
  n >= 100
    ? `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${belowHundred(n % 100)}` : ''}`
    : belowHundred(n);

const wholeNumberInWords = (n: number): string => {
  if (n === 0) return 'Zero';
  // Indian grouping: crore (10^7), lakh (10^5), thousand, then the last three digits.
  const parts: [number, string][] = [
    [Math.floor(n / 10_000_000), 'Crore'],
    [Math.floor((n % 10_000_000) / 100_000), 'Lakh'],
    [Math.floor((n % 100_000) / 1000), 'Thousand'],
  ];
  const words = parts.filter(([v]) => v > 0).map(([v, label]) => `${belowHundred(v)} ${label}`);
  if (n % 1000 > 0) words.push(belowThousand(n % 1000));
  return words.join(' ');
};

/** "Rupees One Hundred Twenty Only", with paise when there are any. */
export const amountInWords = (paise: number): string => {
  const rupees = Math.floor(paise / 100);
  const remainder = paise % 100;
  const paiseWords = remainder > 0 ? ` and ${belowHundred(remainder)} Paise` : '';
  return `Rupees ${wholeNumberInWords(rupees)}${paiseWords} Only`;
};
