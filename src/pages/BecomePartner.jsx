import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, Upload, Loader2, MapPin, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const categories = [
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'loja', label: 'Loja' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'saude', label: 'Saúde' },
  { value: 'beleza', label: 'Beleza' },
  { value: 'educacao', label: 'Educação' },
  { value: 'entretenimento', label: 'Entretenimento' },
  { value: 'mercado', label: 'Mercado' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'outro', label: 'Outro' },
];

export default function BecomePartner() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingMaterials, setUploadingMaterials] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    business_name: '',
    owner_name: '',
    owner_email: '',
    whatsapp: '',
    category: '',
    address: '',
    latitude: null,
    longitude: null,
    benefit_description: '',
    discount_value: '',
    logo_url: '',
    business_photo_url: '',
    marketing_materials: [],
    notes: '',
  });

  const handleFileUpload = async (file, field) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (field === 'logo_url') setUploadingLogo(true);
      else if (field === 'business_photo_url') setUploadingPhoto(true);
      else setUploadingMaterials(true);

      const result = await base44.integrations.Core.UploadFile({ file });
      
      if (field === 'marketing_materials') {
        setFormData(prev => ({
          ...prev,
          marketing_materials: [...prev.marketing_materials, result.file_url]
        }));
      } else {
        setFormData(prev => ({ ...prev, [field]: result.file_url }));
      }
      
      toast.success('Arquivo enviado com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar arquivo');
    } finally {
      if (field === 'logo_url') setUploadingLogo(false);
      else if (field === 'business_photo_url') setUploadingPhoto(false);
      else setUploadingMaterials(false);
    }
  };

  const removeMaterial = (index) => {
    setFormData(prev => ({
      ...prev,
      marketing_materials: prev.marketing_materials.filter((_, i) => i !== index)
    }));
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
          toast.success('Localização capturada!');
        },
        () => {
          toast.error('Não foi possível obter sua localização');
        }
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await base44.entities.PartnerRequest.create(formData);
      setSubmitted(true);
      toast.success('Solicitação enviada com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar solicitação');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-12 pb-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Solicitação Enviada!</h2>
            <p className="text-muted-foreground mb-6">
              Recebemos sua solicitação para se tornar parceiro Sou Brasil. Nossa equipe entrará em contato em breve!
            </p>
            <Button onClick={() => navigate('/Profile')} className="w-full">
              Voltar ao Perfil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/Profile')} className="mb-4">
            ← Voltar
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
              <Store className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Seja um Parceiro</h1>
              <p className="text-sm text-muted-foreground">Cadastre seu comércio na rede Sou Brasil</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados do Negócio */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Negócio</CardTitle>
              <CardDescription>Informações básicas do seu comércio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="business_name">Nome do Comércio *</Label>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  required
                  placeholder="Ex: Restaurante Sabor Brasileiro"
                />
              </div>

              <div>
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card>
            <CardHeader>
              <CardTitle>Informações de Contato</CardTitle>
              <CardDescription>Como os clientes poderão entrar em contato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="owner_name">Nome do Responsável</Label>
                <Input
                  id="owner_name"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <Label htmlFor="owner_email">E-mail *</Label>
                <Input
                  id="owner_email"
                  type="email"
                  value={formData.owner_email}
                  onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                  required
                  placeholder="seuemail@exemplo.com"
                />
              </div>

              <div>
                <Label htmlFor="whatsapp">WhatsApp *</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  required
                  placeholder="(11) 99999-9999"
                />
              </div>
            </CardContent>
          </Card>

          {/* Localização */}
          <Card>
            <CardHeader>
              <CardTitle>Localização</CardTitle>
              <CardDescription>Onde seu comércio está localizado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">Endereço Completo *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  placeholder="Rua, número, bairro, cidade - estado"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={getCurrentLocation}
                  className="flex-1"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Capturar Localização Atual
                </Button>
              </div>

              {formData.latitude && formData.longitude && (
                <div className="bg-primary/5 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground">
                    📍 Coordenadas: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Benefício */}
          <Card>
            <CardHeader>
              <CardTitle>Benefício Oferecido</CardTitle>
              <CardDescription>Qual desconto você oferecerá aos clientes Sou Brasil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="discount_value">Valor do Desconto *</Label>
                <Input
                  id="discount_value"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  required
                  placeholder="Ex: 15%, R$ 10, Sobremesa grátis"
                />
              </div>

              <div>
                <Label htmlFor="benefit_description">Descrição do Benefício *</Label>
                <Textarea
                  id="benefit_description"
                  value={formData.benefit_description}
                  onChange={(e) => setFormData({ ...formData, benefit_description: e.target.value })}
                  required
                  placeholder="Descreva em detalhes o benefício oferecido..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Imagens */}
          <Card>
            <CardHeader>
              <CardTitle>Imagens e Materiais</CardTitle>
              <CardDescription>Logo, fotos e materiais de divulgação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <div>
                <Label>Logo do Comércio</Label>
                <div className="mt-2">
                  {formData.logo_url ? (
                    <div className="relative inline-block">
                      <img
                        src={formData.logo_url}
                        alt="Logo"
                        className="w-32 h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 w-6 h-6"
                        onClick={() => setFormData({ ...formData, logo_url: '' })}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo_url')}
                        disabled={uploadingLogo}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Label
                        htmlFor="logo-upload"
                        className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        {uploadingLogo ? (
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        ) : (
                          <div className="text-center">
                            <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Clique para enviar logo</p>
                          </div>
                        )}
                      </Label>
                    </div>
                  )}
                </div>
              </div>

              {/* Foto do Comércio */}
              <div>
                <Label>Foto do Comércio</Label>
                <div className="mt-2">
                  {formData.business_photo_url ? (
                    <div className="relative inline-block">
                      <img
                        src={formData.business_photo_url}
                        alt="Comércio"
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 w-8 h-8"
                        onClick={() => setFormData({ ...formData, business_photo_url: '' })}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'business_photo_url')}
                        disabled={uploadingPhoto}
                        className="hidden"
                        id="photo-upload"
                      />
                      <Label
                        htmlFor="photo-upload"
                        className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        {uploadingPhoto ? (
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        ) : (
                          <div className="text-center">
                            <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Clique para enviar foto</p>
                          </div>
                        )}
                      </Label>
                    </div>
                  )}
                </div>
              </div>

              {/* Materiais de Divulgação */}
              <div>
                <Label>Materiais de Divulgação (Opcional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Imagens para Instagram, Facebook e outras redes sociais
                </p>
                <div className="space-y-3">
                  {formData.marketing_materials.map((url, index) => (
                    <div key={index} className="relative">
                      <img
                        src={url}
                        alt={`Material ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 w-8 h-8"
                        onClick={() => removeMaterial(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'marketing_materials')}
                      disabled={uploadingMaterials}
                      className="hidden"
                      id="materials-upload"
                    />
                    <Label
                      htmlFor="materials-upload"
                      className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      {uploadingMaterials ? (
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      ) : (
                        <div className="text-center">
                          <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Adicionar material</p>
                        </div>
                      )}
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle>Observações Adicionais</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Alguma informação adicional que gostaria de compartilhar..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Enviando Solicitação...
              </>
            ) : (
              <>
                <Store className="w-5 h-5 mr-2" />
                Enviar Solicitação
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}