import Icone from './Icone';

export function Logo({ grande = false }: { grande?: boolean }) {
  return (
    <div className={grande ? 'logo logo-grande' : 'logo'}>
      <span className="logo-marca">
        <Icone nome="shield" />
      </span>
      <span className="logo-texto">
        Athena <strong>FinHub</strong>
      </span>
    </div>
  );
}
