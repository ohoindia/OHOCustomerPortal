import { Heart } from '../../components/Icons';
import {
  AppShell,
  PageHeader,
  SearchBar,
  Chip,
} from '../../components/Layout';
import { HospitalCard } from '../../components/Cards';
import { hospitals } from '../../data/mockData';

export function Hospitals() {
  return (
    <AppShell>
      <PageHeader title="Hospitals" right={<Heart size={19} />} />
      <SearchBar placeholder="Search hospitals..." />
      <div className="chips">
        <Chip active>All</Chip>
        <Chip>Multi Speciality</Chip>
        <Chip>Cardiac</Chip>
        <Chip>Ortho</Chip>
      </div>
      <div className="stack">
        {hospitals.map((h) => (
          <HospitalCard key={h.id} hospital={h} />
        ))}
      </div>
    </AppShell>
  );
}
