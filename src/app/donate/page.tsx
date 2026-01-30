'use client';

import { useState } from 'react';
import { Heart, Mic, Film, Info, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PAYPAL_URL = 'https://paypal.me/RocketLeagueIceland';
const PRESET_AMOUNTS = [500, 1000, 2000, 5000];

export default function DonatePage() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomChange = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    setCustomAmount(numericValue);
    if (numericValue) {
      setSelectedAmount(null);
    }
  };

  const getActiveAmount = (): number | null => {
    if (customAmount) {
      const parsed = parseInt(customAmount, 10);
      return isNaN(parsed) || parsed <= 0 ? null : parsed;
    }
    return selectedAmount;
  };

  const handleDonate = () => {
    const amount = getActiveAmount();
    if (amount) {
      window.open(`${PAYPAL_URL}/${amount}`, '_blank');
    }
  };

  const activeAmount = getActiveAmount();

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Hero Section */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Heart className="h-8 w-8 text-red-500" />
          <h1 className="text-4xl font-bold">Support RLIS</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Your donations keep the league running
        </p>
      </div>

      {/* Distribution Section */}
      <Card>
        <CardHeader>
          <CardTitle>Where Your Money Goes</CardTitle>
          <CardDescription>
            Donations are distributed to support the people behind RLIS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Casters Card */}
            <div className="p-6 rounded-lg bg-muted text-center space-y-3">
              <div className="flex justify-center">
                <Mic className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">50%</h3>
              <h4 className="font-semibold">Casters</h4>
              <p className="text-sm text-muted-foreground">
                Split based on the number of broadcasts each caster participates in
              </p>
            </div>

            {/* Production Card */}
            <div className="p-6 rounded-lg bg-muted text-center space-y-3">
              <div className="flex justify-center">
                <Film className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">50%</h3>
              <h4 className="font-semibold">Production & Behind the Scenes</h4>
              <p className="text-sm text-muted-foreground">
                Split fairly among the production team
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="flex gap-3 p-4 rounded-lg bg-muted/50 border border-border">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Funds may also be used to cover league expenses such as trophies,
              graphics design, contractor work, and other operational costs.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Amount Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Choose an Amount</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preset Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRESET_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                variant={selectedAmount === amount && !customAmount ? 'default' : 'outline'}
                className="h-12 text-lg"
                onClick={() => handlePresetClick(amount)}
              >
                {amount.toLocaleString('is-IS')} kr
              </Button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Or enter a custom amount</label>
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Enter amount"
                value={customAmount}
                onChange={(e) => handleCustomChange(e.target.value)}
                className="text-lg h-12"
              />
              <span className="text-lg font-medium text-muted-foreground">kr</span>
            </div>
          </div>

          {/* Donate Button */}
          <Button
            size="lg"
            className="w-full h-14 text-lg"
            disabled={!activeAmount}
            onClick={handleDonate}
          >
            <Heart className="mr-2 h-5 w-5" />
            Donate {activeAmount ? `${activeAmount.toLocaleString('is-IS')} kr` : ''} with PayPal
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Thank You Section */}
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-lg">
              Thank you for supporting Icelandic Rocket League esports!
            </p>
            <p className="text-3xl">🚀</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
