import { ReactNode } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useSettings } from '../hooks/useSettings';

type Kind = 'privacy' | 'terms' | 'cookies';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 font-display text-2xl font-semibold">{title}</h2>
      <div className="space-y-2 text-ink-600">{children}</div>
    </section>
  );
}

/** Legal texts. They are a solid starting point, but should be reviewed by the salon's legal advisor. */
export default function Legal({ kind }: { kind: Kind }) {
  const { settings } = useSettings();
  const contact = `${settings.email} / ${settings.phone}`;

  return (
    <div className="container-page max-w-3xl py-14">
      {kind === 'privacy' && (
        <>
          <PageHeader eyebrow="Legal" title="Politica de confidențialitate" subtitle="Cum prelucrăm datele tale personale, conform Regulamentului (UE) 2016/679 (GDPR)." />
          <Section title="Operatorul datelor">
            <p>
              {settings.salonName}, {settings.address}, {settings.city}. Contact pentru protecția datelor: {contact}.
            </p>
          </Section>
          <Section title="Ce date colectăm">
            <p>Nume, prenume, email, număr de telefon, parolă (stocată doar sub formă de hash), istoricul rezervărilor și observațiile pe care le adaugi.</p>
          </Section>
          <Section title="Scopul și temeiul prelucrării">
            <p>
              Gestionarea contului și a rezervărilor (executarea contractului), notificări despre rezervări (interes legitim / contract), securitatea aplicației și respectarea obligațiilor legale. Prelucrarea se
              bazează pe consimțământul exprimat la crearea contului.
            </p>
          </Section>
          <Section title="Cui dezvăluim datele">
            <p>Datele nu sunt vândute și nu sunt afișate altor clienți. Pot fi accesate doar de personalul salonului și de furnizorii de servicii tehnice (găzduire), în baza unor acorduri de prelucrare.</p>
          </Section>
          <Section title="Perioada de stocare">
            <p>Păstrăm datele cât timp ai cont activ. După ștergerea contului, datele personale sunt anonimizate; rezervările anterioare rămân doar în formă anonimă, pentru evidențe și statistici.</p>
          </Section>
          <Section title="Drepturile tale">
            <p>
              Acces, rectificare, ștergere, restricționare, portabilitate și opoziție. Din pagina <strong>Profil</strong> poți modifica datele, descărca o copie a lor și șterge contul. Ai dreptul să depui o plângere la
              ANSPDCP (www.dataprotection.ro).
            </p>
          </Section>
        </>
      )}

      {kind === 'terms' && (
        <>
          <PageHeader eyebrow="Legal" title="Termeni și condiții" subtitle="Regulile de utilizare a aplicației de rezervări." />
          <Section title="Rezervări">
            <p>Rezervarea unui interval este valabilă după confirmarea ei de către sistem sau de către salon. Un interval ocupat nu poate fi rezervat de alți clienți.</p>
          </Section>
          <Section title="Modificare și anulare">
            <p>
              Rezervările pot fi modificate sau anulate online cu minimum {settings.cancellationHours} ore înainte de începere. După acest termen, te rugăm să contactezi salonul la {settings.phone}. Absențele repetate
              pot duce la limitarea posibilității de a rezerva online.
            </p>
          </Section>
          <Section title="Prețuri și plată">
            <p>Prețurile afișate sunt în {settings.currency}, cu TVA inclus unde este cazul. Plata se face în salon, după efectuarea serviciului.</p>
          </Section>
          <Section title="Contul tău">
            <p>Ești responsabil(ă) pentru păstrarea confidențialității parolei și pentru corectitudinea datelor furnizate.</p>
          </Section>
          <Section title="Contraindicații">
            <p>Te rugăm să ne informezi despre afecțiuni, alergii sau sarcină înainte de tratament. Salonul poate refuza un serviciu dacă există contraindicații.</p>
          </Section>
        </>
      )}

      {kind === 'cookies' && (
        <>
          <PageHeader eyebrow="Legal" title="Politica de cookie-uri" subtitle="Ce stocăm în browserul tău și de ce." />
          <Section title="Stocare strict necesară">
            <p>Folosim stocarea locală a browserului (localStorage / sessionStorage) pentru: păstrarea sesiunii de autentificare („Ține-mă minte”) și pentru reținerea alegerii tale privind acest mesaj.</p>
          </Section>
          <Section title="Fără urmărire">
            <p>Nu folosim cookie-uri de marketing sau de analiză a comportamentului. Dacă acest lucru se schimbă, îți vom cere consimțământul în prealabil.</p>
          </Section>
          <Section title="Servicii terțe">
            <p>Harta din pagina de contact (Google Maps) și fonturile (Google Fonts) sunt încărcate de la terți, care pot stoca propriile cookie-uri conform politicilor lor.</p>
          </Section>
          <Section title="Cum le ștergi">
            <p>Din setările browserului poți șterge oricând datele stocate; vei fi deconectat(ă) din cont.</p>
          </Section>
        </>
      )}
    </div>
  );
}
