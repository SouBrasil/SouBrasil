import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function OnboardingRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cpf: '',
    cep: '',
    city: '',
    state: '',
    address: '',
  });

  const handleCEPBlur = async () => {
    if (formData.cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${formData.cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            city: data.localidade,
            state: data.uf,
            address: `${data.logradouro}, ${data.bairro}`,
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        cpf: formData.cpf,
        cep: formData.cep,
        city: formData.city,
        state: formData.state,
        address: formData.address,
        profile_completed: true,
      };

      if (referralCode) {
        updateData.referral_code_used = referralCode;
      }

      await base44.auth.updateMe(updateData);
      toast.success('Cadastro completo!');
      navigate('/Home');
    } catch (error) {
      toast.error('Erro ao completar cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="https://media.base44.com/images/public/69b853fcf2849363360f797c/f1e283268_LogoSouBrasil-Oficial2-PNG.png" 
              alt="Sou Brasil" 
              className="h-16"
            />
          </div>
          <CardTitle className="text-2xl">Bem-vindo ao Sou Brasil!</CardTitle>
          <CardDescription>Complete seu cadastro para começar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                required
                maxLength={14}
              />
            </div>

            <div>
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                placeholder="00000-000"
                value={formData.cep}
                onChange={(e) => setFormData({ ...formData, cep: e.target.value.replace(/\D/g, '') })}
                onBlur={handleCEPBlur}
                required
                maxLength={8}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  required
                  maxLength={2}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            {referralCode && (
              <div className="bg-accent/20 border border-accent rounded-lg p-3 text-sm text-center">
                🎉 Você foi indicado! Código: <strong>{referralCode}</strong>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Começar a usar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}