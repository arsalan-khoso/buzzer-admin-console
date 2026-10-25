import { convertToParamMap } from '@angular/router';
import { DEFAULT_TRANSACTION_VIEW, paymentMethodLabel, readTransactionView } from './payments.util';

describe('payments utils', () => {
  it('should read filters, search, page and sorting from the URL', () => {
    const view = readTransactionView(
      convertToParamMap({
        status: 'REFUNDED',
        currency: 'eur',
        search: ' TXN-1 ',
        page: '3',
        sortBy: 'amount',
        sortOrder: 'asc',
      }),
    );
    expect(view).toEqual({
      status: 'REFUNDED',
      currency: 'EUR',
      search: 'TXN-1',
      page: 3,
      sortBy: 'amount',
      sortOrder: 'asc',
    });
  });

  it('should fall back to the defaults for values the backend would reject', () => {
    const view = readTransactionView(
      convertToParamMap({
        status: 'BAD',
        currency: 'JPY',
        page: '-2',
        sortBy: 'nope',
        sortOrder: 'x',
      }),
    );
    expect(view).toEqual(DEFAULT_TRANSACTION_VIEW);
  });

  it('should label payment methods', () => {
    expect(paymentMethodLabel('apple_pay')).toBe('Apple Pay');
    expect(paymentMethodLabel('paypal')).toBe('PayPal');
    expect(paymentMethodLabel('bank_transfer')).toBe('Bank Transfer');
    expect(paymentMethodLabel(null)).toBe('—');
  });
});
