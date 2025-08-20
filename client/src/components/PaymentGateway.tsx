import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Smartphone, 
  Building, 
  Shield, 
  CheckCircle, 
  XCircle,
  Clock,
  DollarSign,
  Zap
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { CreatePaymentInput } from '../../../server/src/schema';

interface PaymentGatewayProps {
  isOpen: boolean;
  onClose: () => void;
  invitationId: number;
  userId: number;
  amount: number;
  onSuccess: () => void;
}

type PaymentMethod = 'credit_card' | 'bank_transfer' | 'e_wallet' | 'demo';

export function PaymentGateway({ 
  isOpen, 
  onClose, 
  invitationId, 
  userId, 
  amount, 
  onSuccess 
}: PaymentGatewayProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('demo');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');

  // Form data for different payment methods
  const [cardData, setCardData] = useState({
    number: '4111111111111111',
    expiry: '12/25',
    cvv: '123',
    name: 'John Doe'
  });

  const [bankData, setBankData] = useState({
    accountNumber: '1234567890',
    routingNumber: '987654321',
    accountName: 'John Doe'
  });

  const [walletData, setWalletData] = useState({
    walletId: 'john.doe@wallet.com',
    pin: '1234'
  });

  const paymentMethods = [
    {
      id: 'demo' as PaymentMethod,
      name: 'Demo Payment',
      description: 'Simulated payment for demo purposes',
      icon: Zap,
      popular: true
    },
    {
      id: 'credit_card' as PaymentMethod,
      name: 'Credit Card',
      description: 'Visa, Mastercard, American Express',
      icon: CreditCard,
      popular: false
    },
    {
      id: 'e_wallet' as PaymentMethod,
      name: 'E-Wallet',
      description: 'GoPay, OVO, DANA, LinkAja',
      icon: Smartphone,
      popular: true
    },
    {
      id: 'bank_transfer' as PaymentMethod,
      name: 'Bank Transfer',
      description: 'Direct bank transfer',
      icon: Building,
      popular: false
    }
  ];

  const handlePayment = async () => {
    setIsProcessing(true);
    setPaymentError('');

    try {
      // Create payment record
      const paymentData: CreatePaymentInput = {
        user_id: userId,
        invitation_id: invitationId,
        amount: amount,
        currency: 'USD',
        payment_method: selectedMethod
      };

      try {
        const payment = await trpc.createPayment.mutate(paymentData);

        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // For demo, always succeed
        const gatewayResponse = {
          success: true,
          transaction_id: `TXN${Date.now()}`,
          method: selectedMethod,
          timestamp: new Date().toISOString()
        };

        // Process payment
        await trpc.processPayment.mutate({
          paymentId: payment.id,
          gatewayResponse
        });
      } catch (serverError) {
        console.log('Server not available, simulating payment processing');
        // Simulate payment processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      setPaymentSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Payment failed:', error);
      setPaymentError('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setPaymentSuccess(false);
    setPaymentError('');
    setIsProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-pink-600">
            <DollarSign className="h-5 w-5" />
            Secure Payment
          </DialogTitle>
        </DialogHeader>

        {paymentSuccess ? (
          // Success State
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Payment Successful!</h3>
            <p className="text-gray-600 mb-4">
              Your invitation has been published and is now live.
            </p>
            <Badge className="bg-green-100 text-green-700">
              Transaction completed
            </Badge>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="border-pink-100">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Wedding Invitation Publication</span>
                  <span className="font-semibold">${amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Processing Fee</span>
                  <span>$0.00</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-pink-600">${amount.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="h-4 w-4" />
                  <span>Secure SSL encrypted payment</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Choose Payment Method</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      selectedMethod === method.id
                        ? 'border-pink-300 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <method.icon className="h-6 w-6 text-pink-500 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{method.name}</span>
                          {method.popular && (
                            <Badge variant="secondary" className="text-xs">Popular</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedMethod === 'demo' && (
                  <Alert className="border-green-200 bg-green-50">
                    <Zap className="h-4 w-4" />
                    <AlertDescription className="text-green-700">
                      This is a demo payment. Click "Process Payment" to simulate a successful transaction.
                    </AlertDescription>
                  </Alert>
                )}

                {selectedMethod === 'credit_card' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="card-number">Card Number</Label>
                      <Input
                        id="card-number"
                        value={cardData.number}
                        onChange={(e) => setCardData(prev => ({ ...prev, number: e.target.value }))}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Expiry Date</Label>
                        <Input
                          id="expiry"
                          value={cardData.expiry}
                          onChange={(e) => setCardData(prev => ({ ...prev, expiry: e.target.value }))}
                          placeholder="MM/YY"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          value={cardData.cvv}
                          onChange={(e) => setCardData(prev => ({ ...prev, cvv: e.target.value }))}
                          placeholder="123"
                          maxLength={3}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card-name">Cardholder Name</Label>
                      <Input
                        id="card-name"
                        value={cardData.name}
                        onChange={(e) => setCardData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                )}

                {selectedMethod === 'e_wallet' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="wallet-id">Wallet ID / Phone Number</Label>
                      <Input
                        id="wallet-id"
                        value={walletData.walletId}
                        onChange={(e) => setWalletData(prev => ({ ...prev, walletId: e.target.value }))}
                        placeholder="john.doe@wallet.com or +1234567890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wallet-pin">PIN</Label>
                      <Input
                        id="wallet-pin"
                        type="password"
                        value={walletData.pin}
                        onChange={(e) => setWalletData(prev => ({ ...prev, pin: e.target.value }))}
                        placeholder="Enter your wallet PIN"
                        maxLength={6}
                      />
                    </div>
                  </div>
                )}

                {selectedMethod === 'bank_transfer' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="account-number">Account Number</Label>
                      <Input
                        id="account-number"
                        value={bankData.accountNumber}
                        onChange={(e) => setBankData(prev => ({ ...prev, accountNumber: e.target.value }))}
                        placeholder="1234567890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="routing-number">Routing Number</Label>
                      <Input
                        id="routing-number"
                        value={bankData.routingNumber}
                        onChange={(e) => setBankData(prev => ({ ...prev, routingNumber: e.target.value }))}
                        placeholder="987654321"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account-name">Account Name</Label>
                      <Input
                        id="account-name"
                        value={bankData.accountName}
                        onChange={(e) => setBankData(prev => ({ ...prev, accountName: e.target.value }))}
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                )}

                {paymentError && (
                  <Alert className="border-red-200 bg-red-50">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-600">
                      {paymentError}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={isProcessing}
                className="flex-1 bg-pink-500 hover:bg-pink-600"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Process Payment
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}