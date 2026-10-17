// @vitest-environment jsdom
// The OTP hook hands the page the device proof from the last fresh verification, so the order
// request can carry it. A phone that was already verified (no OTP needed) has none.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const otpService = vi.hoisted(() => ({
  getStatus: vi.fn(),
  request: vi.fn(),
  verify: vi.fn(),
  confirmToken: vi.fn(),
}));
vi.mock('../src/services/otp', () => ({ default: otpService }));
vi.mock('../src/services/msg91Widget', () => ({
  loadMsg91Widget: vi.fn(),
  widgetSendOtp: vi.fn(),
  widgetVerifyOtp: vi.fn(),
}));

import { useOtpVerification } from '../src/hooks/useOtpVerification';

const PHONE = '9876543210';

const runVerifyFlow = async (result: { current: ReturnType<typeof useOtpVerification> }) => {
  await act(async () => {
    await result.current.sendOtp();
  });
  act(() => result.current.setOtpCode('123456'));
  await act(async () => {
    await result.current.verifyOtp();
  });
};

beforeEach(() => {
  vi.resetAllMocks();
  otpService.getStatus.mockResolvedValue({ success: true, verified: false, mode: 'mock' });
  otpService.request.mockResolvedValue({ success: true, code: 'OTP_SENT', message: 'sent' });
});

describe('device proof from the OTP hook', () => {
  test('starts with none', () => {
    const { result } = renderHook(() => useOtpVerification(PHONE));
    expect(result.current.deviceProof).toBeNull();
  });

  test('a fresh verification exposes the proof the server returned', async () => {
    otpService.verify.mockResolvedValue({
      success: true,
      code: 'VERIFIED',
      message: 'ok',
      deviceProof: 'proof.jwt.value',
    });
    const { result } = renderHook(() => useOtpVerification(PHONE));
    await runVerifyFlow(result);
    expect(result.current.otpVerified).toBe(true);
    expect(result.current.deviceProof).toBe('proof.jwt.value');
  });

  test('a verification that comes back without a proof leaves it null', async () => {
    otpService.verify.mockResolvedValue({ success: true, code: 'ALREADY_VERIFIED', message: 'ok' });
    const { result } = renderHook(() => useOtpVerification(PHONE));
    await runVerifyFlow(result);
    expect(result.current.otpVerified).toBe(true);
    expect(result.current.deviceProof).toBeNull();
  });

  test('a phone with a live verification window skips the OTP and has no proof', async () => {
    otpService.getStatus.mockResolvedValue({ success: true, verified: true, mode: 'mock' });
    const { result } = renderHook(() => useOtpVerification(PHONE));
    await act(async () => {
      await result.current.sendOtp();
    });
    expect(result.current.otpVerified).toBe(true);
    expect(result.current.deviceProof).toBeNull();
  });

  test('a failed verification gives no proof', async () => {
    otpService.verify.mockResolvedValue({ success: false, code: 'INVALID_OTP', message: 'no' });
    const { result } = renderHook(() => useOtpVerification(PHONE));
    await runVerifyFlow(result);
    expect(result.current.otpVerified).toBe(false);
    expect(result.current.deviceProof).toBeNull();
  });

  test('changing the phone number drops the proof (it was for the old number)', async () => {
    otpService.verify.mockResolvedValue({
      success: true,
      code: 'VERIFIED',
      message: 'ok',
      deviceProof: 'proof.jwt.value',
    });
    const { result, rerender } = renderHook(({ phone }) => useOtpVerification(phone), {
      initialProps: { phone: PHONE },
    });
    await runVerifyFlow(result);
    expect(result.current.deviceProof).toBe('proof.jwt.value');
    rerender({ phone: '9123456780' });
    expect(result.current.otpVerified).toBe(false);
    expect(result.current.deviceProof).toBeNull();
  });
});
