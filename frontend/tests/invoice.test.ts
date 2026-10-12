import { describe, it, expect } from 'vitest';
import {
  amountInWords,
  invoiceFromBill,
  invoiceFromOrder,
  roundOffPaise,
  splitGst,
} from '../src/utils/invoice';
import { isValidGstinInput } from '../src/constants/gst';

describe('amountInWords', () => {
  it('writes whole rupees in the Indian system', () => {
    expect(amountInWords(0)).toBe('Rupees Zero Only');
    expect(amountInWords(12000)).toBe('Rupees One Hundred Twenty Only');
    expect(amountInWords(39900)).toBe('Rupees Three Hundred Ninety Nine Only');
    expect(amountInWords(125000)).toBe('Rupees One Thousand Two Hundred Fifty Only');
    expect(amountInWords(12_345_600)).toBe(
      'Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six Only',
    );
    expect(amountInWords(2_500_000_000)).toBe('Rupees Two Crore Fifty Lakh Only');
  });

  it('adds paise when there are any', () => {
    expect(amountInWords(41895)).toBe('Rupees Four Hundred Eighteen and Ninety Five Paise Only');
    expect(amountInWords(5)).toBe('Rupees Zero and Five Paise Only');
  });
});

describe('GST split and rounding', () => {
  it('splits tax into CGST and SGST that always add up, odd paisa to SGST', () => {
    expect(splitGst(1895)).toEqual({ cgstPaise: 947, sgstPaise: 948 });
    expect(splitGst(2000)).toEqual({ cgstPaise: 1000, sgstPaise: 1000 });
    expect(splitGst(0)).toEqual({ cgstPaise: 0, sgstPaise: 0 });
  });

  it('computes the round-off so the printed lines add up to the total', () => {
    const base: any = {
      subtotalPaise: 10000,
      discountPaise: 0,
      serviceChargePaise: 0,
      taxPaise: 500,
      totalAmountPaise: 10500,
    };
    expect(roundOffPaise(base)).toBe(0);
    expect(roundOffPaise({ ...base, totalAmountPaise: 10499 })).toBe(-1);
  });
});

describe('building an invoice', () => {
  const items = [
    { name: 'Latte', variantName: 'Large', quantity: 2, pricePaise: 21000, itemTotalPaise: 42000 },
    { name: 'Croissant', quantity: 1, pricePaise: 18900, itemTotalPaise: 18900 },
  ];

  it('maps a customer order and the business', () => {
    const inv = invoiceFromOrder(
      {
        orderId: 'BBA-120926-0002',
        createdAt: '2026-10-12T10:00:00Z',
        customerName: 'Sneha',
        customerPhone: '9812345678',
        tableName: 'Table 01',
        items,
        subtotalPaise: 60900,
        taxPaise: 3045,
        totalAmountPaise: 63945,
        paymentMethod: 'CASH',
        paymentStatus: 'PAID',
        transactionId: '',
      },
      { name: 'Bean & Butter', address: 'Indiranagar', phone: '+91 98220', taxRatePercentage: 5 },
    );
    expect(inv.invoiceNumber).toBe('BBA-120926-0002');
    expect(inv.lines).toHaveLength(2);
    expect(inv.lines[0]).toMatchObject({
      quantity: 2,
      unitPricePaise: 21000,
      amountPaise: 42000,
      variantName: 'Large',
    });
    expect(inv.seller.gstin).toBeUndefined();
    expect(inv.taxRatePercentage).toBe(5);
    expect(inv.payment.transactionId).toBeUndefined();
    expect(roundOffPaise(inv)).toBe(0);
  });

  it('carries the seller GSTIN through when the business has one', () => {
    const business = { name: 'B', gstin: '29ABCDE1234F1Z5', taxRatePercentage: 5 };
    expect(invoiceFromOrder({ items: [] }, business).seller.gstin).toBe('29ABCDE1234F1Z5');
    expect(invoiceFromBill({ items: [], business }).seller.gstin).toBe('29ABCDE1234F1Z5');
    expect(
      invoiceFromOrder({ items: [] }, { ...business, gstin: '' }).seller.gstin,
    ).toBeUndefined();
  });

  it('treats the e-bill the same way and ignores the "N/A" transaction placeholder', () => {
    const inv = invoiceFromBill({
      billNumber: 'X-1',
      date: '2026-10-12',
      business: { name: 'B', taxRatePercentage: 0 },
      customer: { name: 'A' },
      items,
      subtotalPaise: 60900,
      taxPaise: 0,
      totalAmountPaise: 60900,
      transactionId: 'N/A',
    });
    expect(inv.payment.transactionId).toBeUndefined();
    expect(inv.taxPaise).toBe(0);
  });
});

describe('GSTIN input validation', () => {
  it('accepts empty (optional) and well-formed values, case-insensitively', () => {
    expect(isValidGstinInput('')).toBe(true);
    expect(isValidGstinInput('   ')).toBe(true);
    expect(isValidGstinInput('29ABCDE1234F1Z5')).toBe(true);
    expect(isValidGstinInput(' 29abcde1234f1z5 ')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isValidGstinInput('29ABCDE1234F1Z')).toBe(false);
    expect(isValidGstinInput('29ABCDE1234F1X5')).toBe(false);
    expect(isValidGstinInput('hello')).toBe(false);
  });
});
