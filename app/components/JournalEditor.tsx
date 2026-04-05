'use client';

import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

export type JournalEditorHandle = {
  getText: () => string;
};

const toolBtnBase =
  'rounded-lg px-2.5 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10214d]/25 disabled:opacity-40';
const toolBtnIdle =
  'text-neutral-800 hover:bg-neutral-100 disabled:hover:bg-transparent';
const toolBtnActive = 'bg-neutral-200/90 text-neutral-900';

type JournalEditorProps = {
  value: string;
  onChange: (html: string) => void;
};

export const JournalEditor = forwardRef<JournalEditorHandle, JournalEditorProps>(
  function JournalEditor({ value, onChange }, ref) {
    const editor = useEditor(
      {
        immediatelyRender: false,
        extensions: [
          StarterKit.configure({
            heading: false,
            horizontalRule: false,
            codeBlock: false,
            blockquote: false,
            code: false,
            orderedList: {
              HTMLAttributes: { class: 'journal-ol' },
            },
            bulletList: {
              HTMLAttributes: { class: 'journal-ul' },
            },
            listItem: {
              HTMLAttributes: { class: 'journal-li' },
            },
          }),
          Underline,
          Placeholder.configure({
            placeholder: 'Enter your text here…',
          }),
        ],
        content: '',
        editorProps: {
          attributes: {
            class:
              'journal-editor-content min-h-[40vh] w-full px-3 py-3 text-base text-neutral-900 outline-none sm:min-h-[50vh] sm:px-4 sm:text-lg',
          },
        },
        onUpdate: ({ editor: ed }) => {
          onChange(ed.getHTML());
        },
      },
      []
    );

    useEffect(() => {
      if (!editor) return;
      const incoming = value ?? '';
      if (incoming === editor.getHTML()) return;
      editor.commands.setContent(incoming, { emitUpdate: false });
    }, [value, editor]);

    useImperativeHandle(
      ref,
      () => ({
        getText: () => editor?.getText().trim() ?? '',
      }),
      [editor]
    );

    if (!editor) {
      return (
        <div className="min-h-[40vh] w-full animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-neutral-200/80 sm:min-h-[50vh]" />
      );
    }

    return (
      <div className="flex w-full flex-1 flex-col rounded-xl border-0 bg-white shadow-sm ring-1 ring-neutral-200/80 focus-within:ring-2 focus-within:ring-[#10214d]/20">
        <div
          className="flex flex-wrap items-center gap-0.5 border-b border-neutral-100 px-2 py-1.5 sm:gap-1 sm:px-3"
          role="toolbar"
          aria-label="Formatting"
        >
          <button
            type="button"
            className={`${toolBtnBase} ${editor.isActive('bold') ? toolBtnActive : toolBtnIdle}`}
            aria-pressed={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            B
          </button>
          <button
            type="button"
            className={`${toolBtnBase} italic ${editor.isActive('italic') ? toolBtnActive : toolBtnIdle}`}
            aria-pressed={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            I
          </button>
          <button
            type="button"
            className={`${toolBtnBase} underline ${editor.isActive('underline') ? toolBtnActive : toolBtnIdle}`}
            aria-pressed={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            U
          </button>
          <button
            type="button"
            className={`${toolBtnBase} line-through ${editor.isActive('strike') ? toolBtnActive : toolBtnIdle}`}
            aria-pressed={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            S
          </button>
          <span className="mx-0.5 hidden h-5 w-px bg-neutral-200 sm:mx-1 sm:inline-block" aria-hidden />
          <button
            type="button"
            className={`${toolBtnBase} ${editor.isActive('bulletList') ? toolBtnActive : toolBtnIdle}`}
            aria-pressed={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            • List
          </button>
          <button
            type="button"
            className={`${toolBtnBase} ${editor.isActive('orderedList') ? toolBtnActive : toolBtnIdle}`}
            aria-pressed={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1. List
          </button>
        </div>
        <EditorContent editor={editor} className="flex-1 [&_.ProseMirror]:min-h-[inherit]" />
      </div>
    );
  }
);
