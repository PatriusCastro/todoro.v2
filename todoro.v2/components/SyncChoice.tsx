"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { HiCloud, HiDevicePhoneMobile } from "react-icons/hi2"
import { type LinkChoice } from "../lib/sync/engine"

interface SyncChoiceProps {
  choice: LinkChoice
  onResolve: (choice: "local" | "remote") => void
}

/**
 * The one moment sync has to ask a question.
 *
 * Ids are generated locally and never collide across devices, so "merge" would
 * mean "concatenate" and duplicate every task. Dedupe by title is worse: titles
 * aren't unique, and a recurring task mints a fresh id per occurrence, so
 * title-matching would silently delete distinct work. With no key to merge on,
 * the only honest options are keep-mine or keep-theirs.
 *
 * Deliberately not dismissible. Closing it would leave the device signed in and
 * unsynced, which is the one state with no way back to this question.
 */
/** Module level, not nested: a component defined during render gets a fresh
 *  identity each time and remounts its subtree on every state change. */
function Option({
  icon, title, tasks, sessions, note, disabled, onPick,
}: {
  icon: React.ReactNode; title: string
  tasks: number; sessions: number; note: string
  disabled: boolean; onPick: () => void
}) {
  return (
    <button
      onClick={onPick}
      disabled={disabled}
      className="flex items-start gap-3 w-full p-4 rounded-control border border-border bg-surface2
        text-left hover:border-accent disabled:opacity-50 transition-colors">
      <span className="mt-0.5 text-accent shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-body font-extrabold text-tx">{title}</span>
        <span className="block text-meta text-sub tabular-nums mt-0.5">
          {tasks} open task{tasks === 1 ? "" : "s"} · {sessions} session{sessions === 1 ? "" : "s"}
        </span>
        <span className="block text-caption text-sub mt-1.5">{note}</span>
      </span>
    </button>
  )
}

export default function SyncChoice({ choice, onResolve }: SyncChoiceProps) {
  const [picked, setPicked] = useState<"local" | "remote" | null>(null)

  if (typeof document === "undefined") return null

  const pick = (side: "local" | "remote") => { setPicked(side); onResolve(side) }

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-end md:items-center justify-center p-3 xs:p-4 bg-black/80">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Choose which data to keep"
        className="w-full max-w-md panel bg-panel shadow-lg flex flex-col gap-4 p-5 max-h-[92dvh] overflow-y-auto">

        <div className="flex flex-col gap-2">
          <h2 className="text-title font-extrabold text-tx">This device has its own tasks</h2>
          <p className="text-meta text-sub leading-relaxed">
            Your account already has data from another device. Todoro can&rsquo;t safely
            combine two sets of tasks, so pick one to keep.
          </p>
          {/* Takes the frightening half of the decision off the table. */}
          <p className="text-meta text-tx leading-relaxed">
            Your focus history and streak are kept from <span className="font-extrabold">both</span>,
            either way.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Option
            icon={<HiCloud size={20} />}
            title="Use my account's data"
            tasks={choice.remote.tasks}
            sessions={choice.remote.sessions}
            note="This device's tasks download as a backup file first."
            disabled={picked !== null}
            onPick={() => pick("remote")} />
          <Option
            icon={<HiDevicePhoneMobile size={20} />}
            title="Use this device's data"
            tasks={choice.local.tasks}
            sessions={choice.local.sessions}
            note="Replaces your account on every device. The old tasks stay recoverable."
            disabled={picked !== null}
            onPick={() => pick("local")} />
        </div>

        {picked && (
          <p className="text-meta text-sub text-center">Applying&hellip;</p>
        )}
      </div>
    </div>,
    document.body,
  )
}
