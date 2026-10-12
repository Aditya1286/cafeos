import React from 'react';
import { createPortal } from 'react-dom';
import { APP_NAME } from '@/constants/app';
import { formatCurrencyPrecise } from '@/utils/money';
import {
  InvoiceData,
  RESTAURANT_SAC,
  amountInWords,
  roundOffPaise,
  splitGst,
} from '@/utils/invoice';

const money = formatCurrencyPrecise;

/**
 * The invoice that gets printed. It is rendered into a portal on <body> and hidden on screen; the
 * `.print-invoice-root` rules in index.css hide everything else while printing, so "Print"
 * produces this document instead of a copy of the screen. Call `window.print()` to print it.
 *
 * Layout follows an Indian restaurant bill: seller and buyer blocks, invoice number and date, an
 * itemised table, a tax summary (CGST/SGST when GST was charged), the total in figures and
 * words, and the payment details.
 */
export const PrintableInvoice: React.FC<{ invoice: InvoiceData }> = ({ invoice }) => {
  const hasGst = invoice.taxPaise > 0;
  const { cgstPaise, sgstPaise } = splitGst(invoice.taxPaise);
  const halfRate = invoice.taxRatePercentage / 2;
  const taxableValuePaise = invoice.subtotalPaise - invoice.discountPaise;
  const roundOff = roundOffPaise(invoice);

  return createPortal(
    <div className="print-invoice-root">
      <article className="invoice mx-auto text-[12px] leading-snug text-black">
        <header className="text-center pb-3 border-b-2 border-black">
          <h1 className="text-xl font-bold uppercase tracking-wide">{invoice.seller.name}</h1>
          {invoice.seller.address && <p>{invoice.seller.address}</p>}
          {invoice.seller.phone && <p>Phone: {invoice.seller.phone}</p>}
          {invoice.seller.gstin && <p className="font-semibold">GSTIN: {invoice.seller.gstin}</p>}
          <p className="mt-2 text-sm font-bold uppercase tracking-widest">
            {hasGst ? 'Tax Invoice' : 'Bill'}
          </p>
        </header>

        <section className="grid grid-cols-2 gap-4 py-3 border-b border-black">
          <div>
            <p className="font-bold uppercase text-[10px]">Billed to</p>
            <p className="font-semibold">{invoice.buyer.name}</p>
            {invoice.buyer.phone && <p>Phone: {invoice.buyer.phone}</p>}
            {invoice.table && <p>Table: {invoice.table}</p>}
          </div>
          <div className="text-right">
            <p>
              <span className="font-bold">Invoice no.:</span> {invoice.invoiceNumber}
            </p>
            <p>
              <span className="font-bold">Date:</span>{' '}
              {new Date(invoice.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </p>
            <p>
              <span className="font-bold">Time:</span>{' '}
              {new Date(invoice.date).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </section>

        <table className="w-full mt-3 border-collapse">
          <thead>
            <tr className="border-y border-black text-left text-[10px] uppercase">
              <th className="py-1.5 w-8">#</th>
              <th className="py-1.5">Description{hasGst && ` (SAC ${RESTAURANT_SAC})`}</th>
              <th className="py-1.5 text-center w-12">Qty</th>
              <th className="py-1.5 text-right w-20">Rate</th>
              <th className="py-1.5 text-right w-24">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, i) => (
              <tr key={i} className="border-b border-gray-300 align-top">
                <td className="py-1.5">{i + 1}</td>
                <td className="py-1.5">
                  {line.name}
                  {line.variantName && (
                    <span className="block text-[10px]">({line.variantName})</span>
                  )}
                </td>
                <td className="py-1.5 text-center">{line.quantity}</td>
                <td className="py-1.5 text-right">{money(line.unitPricePaise)}</td>
                <td className="py-1.5 text-right">{money(line.amountPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-3 ml-auto w-72 space-y-1">
          <Row label="Subtotal" value={money(invoice.subtotalPaise)} />
          {invoice.discountPaise > 0 && (
            <Row label="Discount" value={`- ${money(invoice.discountPaise)}`} />
          )}
          {invoice.serviceChargePaise > 0 && (
            <Row label="Service charge" value={money(invoice.serviceChargePaise)} />
          )}
          {hasGst && (
            <>
              <Row label="Taxable value" value={money(taxableValuePaise)} />
              <Row label={`CGST @ ${halfRate}%`} value={money(cgstPaise)} />
              <Row label={`SGST @ ${halfRate}%`} value={money(sgstPaise)} />
            </>
          )}
          {roundOff !== 0 && <Row label="Round off" value={money(roundOff)} />}
          <div className="flex justify-between border-y-2 border-black py-1.5 text-sm font-bold">
            <span>Grand total</span>
            <span>{money(invoice.totalAmountPaise)}</span>
          </div>
        </section>

        <p className="mt-2 text-[11px]">
          <span className="font-bold">Amount in words:</span>{' '}
          {amountInWords(invoice.totalAmountPaise)}
        </p>

        <section className="mt-3 pt-2 border-t border-black text-[11px]">
          <p>
            <span className="font-bold">Payment:</span> {invoice.payment.method || '—'} ·{' '}
            {invoice.payment.status || '—'}
          </p>
          {invoice.payment.transactionId && <p>Reference: {invoice.payment.transactionId}</p>}
        </section>

        <footer className="mt-6 pt-2 border-t border-gray-400 text-center text-[10px] text-gray-600">
          <p>
            Thank you for visiting! This is a computer-generated invoice and needs no signature.
          </p>
          <p>Billed with {APP_NAME}</p>
        </footer>
      </article>
    </div>,
    document.body,
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between">
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

export default PrintableInvoice;
