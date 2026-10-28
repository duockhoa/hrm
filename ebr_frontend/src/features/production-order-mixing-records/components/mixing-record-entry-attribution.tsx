import type { MixingActivityTemplateCreator } from "@/features/mixing-activity-templates/types";
import { formatRecordDateTime, getPersonLabel } from "../utils";

export default function MixingRecordEntryAttribution({
  person,
  at,
}: {
  person?: MixingActivityTemplateCreator | null;
  at?: string | null;
}) {
  if (!person && !at) return null;

  return (
    <div className="break-words px-2 pb-2 font-sans text-xs leading-4 text-gray-600">
      {person ? <div>{getPersonLabel(person)}</div> : null}
      {at ? <div>{formatRecordDateTime(at)}</div> : null}
    </div>
  );
}
