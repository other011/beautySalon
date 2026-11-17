import { LocationBlock } from '../components/LocationBlock';
import { PageHeader } from '../components/PageHeader';

export default function Contact() {
  return (
    <div className="container-page py-14">
      <PageHeader eyebrow="Contact" title="Locație și contact" subtitle="Ne găsești ușor și îți răspundem cu drag la orice întrebare." />
      <LocationBlock />
    </div>
  );
}
