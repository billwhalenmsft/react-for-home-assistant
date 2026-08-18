import { useMemo, useState } from 'react';
import { useEntities } from '../ha/useEntities';
import type { Hass } from '../ha/types';
import type { ModeSpec } from './layout';
import { tileGridStyle } from './layout';
import { C, Chip, Icon, ICONS } from './ui';

/**
 * Light Command — the alarm.com parity control Bill has asked for repeatedly:
 * every section on/off, plus one all on/off.
 *
 * It also fixes a specific complaint: "main floor controls are only doing the
 * Hue lights and not the Lutron at the same time". The house group entity does
 * not reliably cover both bridges, so ALL ON / ALL OFF here fans out to every
 * individual light id in one service call instead of trusting the group.
 */

interface Room {
  name: string;
  /** group entity, when one exists — used for state read-out */
  group?: string;
  lights: string[];
}

const ROOMS: Room[] = [
  {
    name: 'Kitchen',
    group: 'light.kitchen_all_lights',
    lights: [
      'light.kitchen_kitchen_island_lights',
      'light.kitchen_kitchen_island_pendants',
      'light.kitchen_kitchen_above_cabinets_left',
      'light.kitchen_kitchen_above_cabinet_right',
      'light.kitchen_left_lower_kitchen_cabinet',
      'light.kitchen_right_kitchen_under_cabinet',
    ],
  },
  { name: 'Living Room', lights: ['light.living_room_living_room_main_lights'] },
  { name: 'Dining', lights: ['light.dining_room_dining_room_chandelier'] },
  { name: 'Entry', lights: ['light.entry_lights'] },
  { name: 'Foyer', lights: ['light.front_foyer_front_foyer_main_lights'] },
  { name: 'Mudroom', lights: ['light.mudroom_mudroom_main_lights'] },
];

const ALL_LIGHTS = ROOMS.flatMap((r) => r.lights);
const WATCHED = [...ALL_LIGHTS, ...ROOMS.map((r) => r.group).filter((g): g is string => !!g)];

const isOn = (s?: string) => s === 'on';

export function LightGrid({ hass, spec }: { hass: Hass; spec: ModeSpec }) {
  const ids = useMemo(() => WATCHED, []);
  const ents = useEntities(hass, ids);
  const [open, setOpen] = useState<string | null>(null);

  const onCount = ALL_LIGHTS.filter((id) => isOn(ents[id]?.state)).length;

  const call = (service: 'turn_on' | 'turn_off', entity_id: string | string[]) =>
    hass.callService('light', service, { entity_id });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* master row — explicit fan-out so Hue and Lutron both move */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: spec.forceSingleColumn ? '12px 14px' : '10px 14px',
          borderRadius: 14,
          border: `1px solid ${onCount ? 'rgba(255,196,140,0.35)' : C.line}`,
          background: onCount ? 'rgba(255,196,140,0.10)' : 'rgba(255,255,255,0.03)',
        }}
      >
        <Icon path={ICONS.bulb} size={20} color={onCount ? C.accent : C.dim} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: Math.round(14 * spec.fontScale), fontWeight: 700, color: C.text }}>
            All main floor
          </div>
          <div style={{ fontSize: Math.round(11.5 * spec.fontScale), color: C.dim }}>
            {onCount} of {ALL_LIGHTS.length} on
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Chip label="All on" tone={onCount === ALL_LIGHTS.length ? 'active' : 'idle'} spec={spec}
                onClick={() => call('turn_on', ALL_LIGHTS)} />
          <Chip label="All off" tone={onCount === 0 ? 'active' : 'idle'} spec={spec}
                onClick={() => call('turn_off', ALL_LIGHTS)} />
        </div>
      </div>

      {/* one row per room */}
      <div style={tileGridStyle(spec, 210)}>
        {ROOMS.map((room) => {
          const anyOn = room.lights.some((id) => isOn(ents[id]?.state));
          const expandable = room.lights.length > 1;
          const expanded = open === room.name;

          return (
            <div
              key={room.name}
              style={{
                border: `1px solid ${anyOn ? 'rgba(255,196,140,0.3)' : C.line}`,
                borderRadius: 14,
                background: anyOn ? 'rgba(255,196,140,0.07)' : 'rgba(255,255,255,0.03)',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
                <button
                  type="button"
                  onClick={() => call(anyOn ? 'turn_off' : 'turn_on', room.lights)}
                  title={`Toggle ${room.name}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0,
                    background: 'none', border: 'none', font: 'inherit', cursor: 'pointer',
                    color: C.text, padding: 0, textAlign: 'left',
                  }}
                >
                  <Icon path={ICONS.bulb} size={17} color={anyOn ? C.accent : C.dim} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{
                      display: 'block', fontSize: Math.round(13.5 * spec.fontScale),
                      fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {room.name}
                    </span>
                    <span style={{ display: 'block', fontSize: Math.round(11 * spec.fontScale), color: C.dim }}>
                      {room.lights.filter((id) => isOn(ents[id]?.state)).length}/{room.lights.length} on
                    </span>
                  </span>
                </button>

                {expandable ? (
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : room.name)}
                    aria-expanded={expanded}
                    aria-label={`${expanded ? 'Hide' : 'Show'} ${room.name} lights`}
                    style={{
                      background: 'none', border: `1px solid ${C.line}`, borderRadius: 8,
                      color: C.dim, cursor: 'pointer', width: 26, height: 26, lineHeight: 1,
                      fontSize: 13, padding: 0,
                    }}
                  >
                    {expanded ? '−' : '+'}
                  </button>
                ) : null}
              </div>

              {expandable && expanded ? (
                <div style={{ borderTop: `1px solid ${C.line}`, padding: 8, display: 'grid', gap: 6 }}>
                  {room.lights.map((id) => {
                    const e = ents[id];
                    const on = isOn(e?.state);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => call(on ? 'turn_off' : 'turn_on', id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                          padding: '7px 9px', borderRadius: 9, cursor: 'pointer', font: 'inherit',
                          border: `1px solid ${on ? 'rgba(255,196,140,0.3)' : 'transparent'}`,
                          background: on ? 'rgba(255,196,140,0.10)' : 'rgba(255,255,255,0.03)',
                          color: on ? C.accent : C.dim,
                          fontSize: Math.round(12 * spec.fontScale), textAlign: 'left',
                        }}
                      >
                        <Icon path={ICONS.power} size={13} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e?.attributes.friendly_name?.replace(/^Kitchen\s+/i, '') ?? id}
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.8 }}>
                          {on ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
