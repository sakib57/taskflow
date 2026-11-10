'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Check } from 'lucide-react';
import { toast } from '@/components/ui/toast';

const schema = z.object({
  amount: z.string().min(1),
  currency: z.string().length(3),
});

type FormData = z.infer<typeof schema>;

export default function BillingPage() {
  const [processing, setProcessing] = useState(false);
  const [lastPayment, setLastPayment] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'USD' },
  });

  const onSubmit = async (data: FormData) => {
    setProcessing(true);
    try {
      // Idempotency key — generated per payment
      const idempotencyKey = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data: payment } = await api.post('/payments', {
        amount: parseFloat(data.amount),
        currency: data.currency,
        paymentMethod: 'stripe',
        idempotencyKey,
      });

      setLastPayment(payment);
      toast.add({
        title: 'Payment successful!',
        description: `$${payment.amount} ${payment.currency}`,
      });
    } catch (err: any) {
      toast.add({
        title: 'Payment failed',
        description: err.response?.data?.error?.message,
        type: 'error',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Billing</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Make Payment
            </CardTitle>
            <CardDescription>Test payment (idempotent)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" step="0.01" placeholder="99.99" {...register('amount')} />
                {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input maxLength={3} {...register('currency')} />
              </div>
              <Button type="submit" disabled={processing} className="w-full">
                {processing ? 'Processing...' : 'Pay Now'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {lastPayment && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Check className="h-5 w-5" />
                Payment Successful
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>ID:</strong> {lastPayment.id}
              </p>
              <p>
                <strong>Amount:</strong> ${lastPayment.amount} {lastPayment.currency}
              </p>
              <p>
                <strong>Status:</strong> {lastPayment.status}
              </p>
              <p>
                <strong>Txn:</strong> {lastPayment.gatewayTxnId}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
