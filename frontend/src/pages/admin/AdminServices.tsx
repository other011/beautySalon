import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { ICON_KEYS, ServiceIcon } from '../../components/ServiceIcon';
import { Pill } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { EmptyState, QueryState } from '../../components/ui/States';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/useToast';
import { servicesApi } from '../../services/endpoints';
import type { SalonServiceItem, ServiceRequest, ServiceSection } from '../../types';
import { fieldErrors, friendlyError } from '../../utils/errors';
import { formatMoney } from '../../utils/format';

const EMPTY: ServiceRequest = { name: '', description: '', durationMinutes: 30, price: 0, benefits: [], equipment: [], sections: [], imageUrl: '', icon: 'flower', active: true };

export default function AdminServices() {
  const { settings } = useSettings();
  const qc = useQueryClient();
  const toast = useToast();
  const query = useQuery({ queryKey: ['services', 'all'], queryFn: () => servicesApi.list(true) });
  const [editing, setEditing] = useState<SalonServiceItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<SalonServiceItem | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['services'] });
    qc.invalidateQueries({ queryKey: ['audit'] });
  };

  const toggle = useMutation({
    mutationFn: (s: SalonServiceItem) => servicesApi.setActive(s.id, !s.active),
    onSuccess: (s) => {
      toast.success(s.active ? 'Serviciul a fost reactivat.' : 'Serviciul a fost dezactivat.');
      refresh();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const remove = useMutation({
    mutationFn: (s: SalonServiceItem) => servicesApi.remove(s.id),
    onSuccess: (res) => {
      toast.success(res.deleted ? 'Serviciul a fost șters.' : 'Serviciul are rezervări în istoric, deci a fost doar dezactivat.');
      setDeleting(null);
      refresh();
    },
    onError: (e) => {
      toast.error(friendlyError(e));
      setDeleting(null);
    },
  });

  return (
    <div>
      <PageHeader
        title="Servicii"
        subtitle="Adaugă, modifică sau dezactivează serviciile oferite."
        action={
          <Button variant="gold" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> Serviciu nou
          </Button>
        }
      />
      <QueryState query={query}>
        {query.data?.length === 0 ? (
          <EmptyState title="Nu există servicii." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {query.data?.map((s) => (
              <article key={s.id} className={`card flex flex-col gap-4 p-5 ${s.active ? '' : 'opacity-70'}`}>
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-600">
                    <ServiceIcon name={s.icon} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-2xl font-semibold">{s.name}</h2>
                      {s.active ? <Pill tone="green">Activ</Pill> : <Pill tone="red">Inactiv</Pill>}
                    </div>
                    <p className="line-clamp-2 text-sm text-ink-600">{s.description}</p>
                    <p className="mt-1 text-sm text-ink-500">
                      {s.durationMinutes} min · {formatMoney(s.price, settings.currency)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-sand-100 pt-4">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(s)}>
                    Modifică
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggle.mutate(s)} loading={toggle.isPending && toggle.variables?.id === s.id}>
                    {s.active ? 'Dezactivează' : 'Reactivează'}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(s)}>
                    <Trash2 className="h-4 w-4" /> Șterge
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </QueryState>

      <ServiceForm target={editing} onClose={() => setEditing(null)} onSaved={refresh} />
      <ConfirmDialog
        open={!!deleting}
        title="Ștergere serviciu"
        message={`Ești sigur că dorești să ștergi serviciul „${deleting?.name}”? Dacă are rezervări în istoric, va fi doar dezactivat.`}
        confirmLabel="Da, șterge"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function ServiceForm({ target, onClose, onSaved }: { target: SalonServiceItem | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const editing = target && target !== 'new' ? target : null;
  const [form, setForm] = useState<ServiceRequest>(EMPTY);
  const [benefits, setBenefits] = useState('');
  const [equipment, setEquipment] = useState('');
  const [sections, setSections] = useState<{ title: string; items: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!target) return;
    setErrors({});
    const s = editing;
    setForm(s ? { ...s, imageUrl: s.imageUrl ?? '', icon: s.icon ?? 'flower' } : EMPTY);
    setBenefits((s?.benefits ?? []).join('\n'));
    setEquipment((s?.equipment ?? []).join('\n'));
    setSections((s?.sections ?? []).map((x) => ({ title: x.title, items: x.items.join('\n') })));
  }, [target, editing]);

  const save = useMutation({
    mutationFn: () => {
      const lines = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean);
      const body: ServiceRequest = {
        name: form.name.trim(),
        description: form.description.trim(),
        durationMinutes: Number(form.durationMinutes),
        price: Number(form.price),
        benefits: lines(benefits),
        equipment: lines(equipment),
        sections: sections.filter((s) => s.title.trim()).map<ServiceSection>((s) => ({ title: s.title.trim(), items: lines(s.items) })),
        imageUrl: form.imageUrl?.trim() || null,
        icon: form.icon,
        active: form.active,
      };
      return editing ? servicesApi.update(editing.id, body) : servicesApi.create(body);
    },
    onSuccess: () => {
      toast.success(editing ? 'Serviciul a fost actualizat.' : 'Serviciul a fost adăugat.');
      onSaved();
      onClose();
    },
    onError: (e) => {
      setErrors(fieldErrors(e));
      toast.error(friendlyError(e));
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!form.name.trim()) err.name = 'Câmp obligatoriu.';
    if (!(Number(form.durationMinutes) >= 5)) err.durationMinutes = 'Minim 5 minute.';
    if (!(Number(form.price) >= 0) || form.price === ('' as unknown)) err.price = 'Preț invalid.';
    setErrors(err);
    if (Object.keys(err).length === 0) save.mutate();
  };

  return (
    <Modal open={!!target} onClose={onClose} title={editing ? 'Modifică serviciul' : 'Serviciu nou'} size="lg">
      <form onSubmit={submit} noValidate className="space-y-4">
        <TextField label="Nume" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <TextAreaField label="Descriere" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} error={errors.description} />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Durată (minute)" type="number" min={5} step={5} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} error={errors.durationMinutes} />
          <TextField label="Preț" type="number" min={0} step="0.5" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} error={errors.price} />
          <SelectField label="Pictogramă" value={form.icon ?? 'flower'} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
            {ICON_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </SelectField>
        </div>
        <TextField label="Imagine (URL, opțional)" value={form.imageUrl ?? ''} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextAreaField label="Beneficii (câte unul pe linie)" value={benefits} onChange={(e) => setBenefits(e.target.value)} />
          <TextAreaField label="Aparatură / echipament (câte unul pe linie)" value={equipment} onChange={(e) => setEquipment(e.target.value)} />
        </div>

        <fieldset className="space-y-3 rounded-xl border border-sand-200 p-4">
          <legend className="px-2 text-sm font-medium text-ink-700">Secțiuni suplimentare (recomandări, contraindicații, zone…)</legend>
          {sections.map((s, i) => (
            <div key={i} className="space-y-2 rounded-xl bg-sand-50 p-3">
              <div className="flex gap-2">
                <input className="input" aria-label={`Titlu secțiune ${i + 1}`} placeholder="Titlu (ex: Contraindicații)" value={s.title} onChange={(e) => setSections(sections.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                <Button type="button" variant="ghost" size="sm" aria-label="Elimină secțiunea" onClick={() => setSections(sections.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <textarea className="input min-h-[72px]" aria-label={`Elemente secțiune ${i + 1}`} placeholder="Câte un element pe linie" value={s.items} onChange={(e) => setSections(sections.map((x, j) => (j === i ? { ...x, items: e.target.value } : x)))} />
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={() => setSections([...sections, { title: '', items: '' }])}>
            <Plus className="h-4 w-4" /> Adaugă secțiune
          </Button>
        </fieldset>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded border-sand-300 text-gold-500 focus:ring-gold-400" />
          Serviciu activ (vizibil pentru rezervări)
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Renunță
          </Button>
          <Button type="submit" loading={save.isPending}>
            Salvează
          </Button>
        </div>
      </form>
    </Modal>
  );
}
