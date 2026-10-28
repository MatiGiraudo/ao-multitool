"use client";
import { CampoNumero } from "@/compartido/ui/componentes";
import type { InfoDeMapa, Mapa } from "../dominio/Mapa";

/*
 * Los datos del mapa: lo que el juego lee del `.dat`.
 *
 * No entra en el historial, a propósito. Es un formulario, como la ficha de un objeto o de un
 * hechizo, y un ctrl+Z que te saque una letra del nombre mientras estás pintando confundiría más
 * de lo que ayuda. El historial es de la edición del lienzo.
 */

/** Los valores que usa el AO clásico. Se puede guardar otro: el que venga en el archivo se respeta. */
const TERRENOS = ["BOSQUE", "NIEVE", "DESIERTO", "CIUDAD", "CAMPO", "DUNGEON"];
const ZONAS = ["CAMPO", "CIUDAD", "DUNGEON"];
const RESTRICCIONES = ["NO", "NEWBIE", "ARMADA", "CAOS", "FACCION", "GM"];

const BANDERAS: { campo: keyof InfoDeMapa; etiqueta: string; ayuda?: string }[] = [
  { campo: "seCombate", etiqueta: "Se puede combatir", ayuda: "En el archivo es «Pk», al revés: Pk=1 es zona segura." },
  { campo: "magiaSinEfecto", etiqueta: "Magia sin efecto" },
  { campo: "invisibilidadSinEfecto", etiqueta: "Invisibilidad sin efecto" },
  { campo: "resucitarSinEfecto", etiqueta: "Resucitar sin efecto" },
  { campo: "noEncriptarMp", etiqueta: "No encriptar MP" },
  { campo: "backup", etiqueta: "Backup" },
];

export function DatosDelMapa({ mapa, onCambio }: { mapa: Mapa; onCambio: (cambios: Partial<InfoDeMapa>) => void }) {
  const i = mapa.info;
  return (
    <>
      <div className="form-grid">
        <label className="f wide" htmlFor="mapa_nombre">
          Nombre
          <input id="mapa_nombre" type="text" value={i.nombre} onChange={(e) => onCambio({ nombre: e.target.value })} />
        </label>
        <Lista id="mapa_zona" etiqueta="Zona" valor={i.zona} opciones={ZONAS} onCambio={(zona) => onCambio({ zona })} />
        <Lista id="mapa_terreno" etiqueta="Terreno" valor={i.terreno} opciones={TERRENOS} onCambio={(terreno) => onCambio({ terreno })} />
        <Lista
          id="mapa_restringir"
          etiqueta="Restringir"
          valor={i.restringir}
          opciones={RESTRICCIONES}
          onCambio={(restringir) => onCambio({ restringir })}
        />
        <CampoNumero id="mapa_mp3" etiqueta="Música (mp3)" valor={i.musicaMp3} min={0} onCambio={(v) => onCambio({ musicaMp3: v ?? 0 })} />
        <CampoNumero id="mapa_midi" etiqueta="Música (midi)" valor={i.musica} min={0} onCambio={(v) => onCambio({ musica: v ?? 0 })} />
      </div>
      <div className="flags">
        {BANDERAS.map(({ campo, etiqueta, ayuda }) => (
          <label key={campo} title={ayuda}>
            <input type="checkbox" checked={!!i[campo]} onChange={(e) => onCambio({ [campo]: e.target.checked })} /> {etiqueta}
          </label>
        ))}
      </div>
      <p className="hint">Los datos del mapa no entran en deshacer; salen con «Exportar», en el `.dat`.</p>
    </>
  );
}

/** Una lista que además banca lo que ya tenía el archivo, aunque no sea uno de los valores conocidos. */
function Lista({
  id,
  etiqueta,
  valor,
  opciones,
  onCambio,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  opciones: string[];
  onCambio: (valor: string) => void;
}) {
  const todas = opciones.includes(valor) ? opciones : [valor, ...opciones];
  return (
    <label className="f" htmlFor={id}>
      {etiqueta}
      <select id={id} value={valor} onChange={(e) => onCambio(e.target.value)}>
        {todas.map((o) => (
          <option key={o} value={o}>
            {o || "(sin especificar)"}
          </option>
        ))}
      </select>
    </label>
  );
}
