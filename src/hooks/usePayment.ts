import { useCallback, useEffect, useState } from 'react';
import {
  confirmPayment,
  createReportOrder,
  getPaymentConfig,
  type ConfirmResult,
  type PaymentConfig,
} from '../api/payment-api';
import type { ScenarioType } from '../api/withdrawal-scenario-api';
import { getApiErrorMessage } from '../utils/api-error-message';
import { isCheckoutCanceled, isTossConfigured, openTossCheckout, rememberPaymentReturn } from '../utils/toss-checkout';

/** 리포트 가격 설정 — 불러오지 못하면 null (무료로 만들기를 시도하고 서버가 402로 막는다) */
export function usePaymentConfig() {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getPaymentConfig()
      .then((value) => {
        if (active) setConfig(value);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return { config, isLoaded };
}

export function usePayment() {
  const [isStarting, setIsStarting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 주문을 만들고 결제창을 연다 — 성공하면 결제창이 화면을 이동시킨다 */
  const startCheckout = useCallback(
    async (scenarioSetId: number, scenarioType: ScenarioType, returnPath: string): Promise<boolean> => {
      setError(null);
      if (!isTossConfigured()) {
        setError('결제 설정이 아직 끝나지 않았어요. 잠시 후 다시 시도해 주세요');
        return false;
      }
      setIsStarting(true);
      try {
        const order = await createReportOrder(scenarioSetId, scenarioType);
        rememberPaymentReturn(returnPath);
        await openTossCheckout(order);
        return true;
      } catch (err) {
        if (!isCheckoutCanceled(err)) {
          setError(getApiErrorMessage(err, '결제창을 열지 못했어요. 잠시 후 다시 시도해 주세요'));
        }
        return false;
      } finally {
        setIsStarting(false);
      }
    },
    [],
  );

  const confirm = useCallback(
    async (input: { paymentKey: string; orderId: string; amount: number }): Promise<ConfirmResult> => {
      setIsConfirming(true);
      setError(null);
      try {
        return await confirmPayment(input);
      } catch (err) {
        setError(getApiErrorMessage(err, '결제를 확인하지 못했어요. 다시 시도해 주세요'));
        throw err;
      } finally {
        setIsConfirming(false);
      }
    },
    [],
  );

  return { isStarting, isConfirming, error, startCheckout, confirm };
}
