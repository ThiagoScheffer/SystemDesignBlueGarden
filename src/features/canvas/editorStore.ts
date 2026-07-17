import { create } from 'zustand';
import {
  createArchitectureDocument,
  createArchitectureEdge,
  createArchitectureNode,
} from '../../domain/architecture/factories';
import type {
  ArchitectureDocumentV1,
  ComponentType,
  EdgeConfig,
  OperationalConfig,
} from '../../domain/architecture/types';

export type EditorSelection =
  { kind: 'node'; id: string } | { kind: 'edge'; id: string } | null;

interface EditorState {
  document: ArchitectureDocumentV1;
  selection: EditorSelection;
  expandedInfoNodeId: string | null;
  past: ArchitectureDocumentV1[];
  future: ArchitectureDocumentV1[];
  transactionBase: ArchitectureDocumentV1 | null;
  addNode: (type: ComponentType, position?: { x: number; y: number }) => void;
  addEdge: (source: string, target: string) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  updateNode: (
    id: string,
    changes: {
      label?: string;
      description?: string;
      implementationNotes?: string;
      config?: Partial<OperationalConfig>;
    },
  ) => void;
  updateNodeTransient: (
    id: string,
    changes: {
      label?: string;
      description?: string;
      implementationNotes?: string;
      config?: Partial<OperationalConfig>;
    },
  ) => void;
  updateEdge: (
    id: string,
    changes: { label?: string; config?: Partial<EdgeConfig> },
  ) => void;
  updateEdgeTransient: (
    id: string,
    changes: { label?: string; config?: Partial<EdgeConfig> },
  ) => void;
  select: (selection: EditorSelection) => void;
  toggleInfoNode: (id: string) => void;
  closeInfoNode: () => void;
  deleteSelection: () => void;
  checkpoint: () => void;
  beginTransaction: () => void;
  commitTransaction: () => void;
  cancelTransaction: () => void;
  undo: () => void;
  redo: () => void;
  newDocument: () => void;
  hydrateDocument: (document: ArchitectureDocumentV1) => void;
  replaceDocument: (document: ArchitectureDocumentV1) => void;
  renameDocument: (name: string) => void;
}

const cloneDocument = (document: ArchitectureDocumentV1) =>
  structuredClone(document);

const touch = (document: ArchitectureDocumentV1): ArchitectureDocumentV1 => ({
  ...document,
  metadata: { ...document.metadata, updatedAt: new Date().toISOString() },
});

const withHistory = (
  state: EditorState,
  document: ArchitectureDocumentV1,
): Partial<EditorState> => ({
  document: touch(document),
  past: [...state.past.slice(-49), cloneDocument(state.document)],
  future: [],
});

type NodeChanges = {
  label?: string;
  description?: string;
  implementationNotes?: string;
  config?: Partial<OperationalConfig>;
};

const applyNodeUpdate = (
  document: ArchitectureDocumentV1,
  id: string,
  changes: NodeChanges,
): ArchitectureDocumentV1 => ({
  ...document,
  nodes: document.nodes.map((node) =>
    node.id === id
      ? {
          ...node,
          data: {
            ...node.data,
            ...(changes.label !== undefined && { label: changes.label }),
            ...(changes.description !== undefined && {
              description: changes.description,
            }),
            ...(changes.implementationNotes !== undefined && {
              implementationNotes: changes.implementationNotes,
            }),
            ...(changes.config && {
              config: { ...node.data.config, ...changes.config },
            }),
          },
        }
      : node,
  ),
});

const applyEdgeUpdate = (
  document: ArchitectureDocumentV1,
  id: string,
  changes: { label?: string; config?: Partial<EdgeConfig> },
): ArchitectureDocumentV1 => ({
  ...document,
  edges: document.edges.map((edge) =>
    edge.id === id
      ? {
          ...edge,
          ...(changes.label !== undefined && { label: changes.label }),
          ...(changes.config && {
            config: { ...edge.config, ...changes.config },
          }),
        }
      : edge,
  ),
});

const documentContent = (document: ArchitectureDocumentV1) =>
  JSON.stringify({
    ...document,
    metadata: { ...document.metadata, updatedAt: '' },
  });

export const useEditorStore = create<EditorState>((set) => ({
  document: createArchitectureDocument(),
  selection: null,
  expandedInfoNodeId: null,
  past: [],
  future: [],
  transactionBase: null,

  addNode: (type, position = { x: 280, y: 180 }) =>
    set((state) => {
      const node = createArchitectureNode(type, position);
      return {
        ...withHistory(state, {
          ...state.document,
          nodes: [...state.document.nodes, node],
        }),
        selection: { kind: 'node', id: node.id },
      };
    }),

  addEdge: (source, target) =>
    set((state) => {
      if (source === target) return state;
      const duplicate = state.document.edges.some(
        (edge) => edge.source === source && edge.target === target,
      );
      if (duplicate) return state;
      const edge = createArchitectureEdge(source, target);
      return {
        ...withHistory(state, {
          ...state.document,
          edges: [...state.document.edges, edge],
        }),
        selection: { kind: 'edge', id: edge.id },
      };
    }),

  updateNodePosition: (id, position) =>
    set((state) => ({
      document: touch({
        ...state.document,
        nodes: state.document.nodes.map((node) =>
          node.id === id ? { ...node, position } : node,
        ),
      }),
    })),

  updateNode: (id, changes) =>
    set((state) =>
      withHistory(state, applyNodeUpdate(state.document, id, changes)),
    ),

  updateNodeTransient: (id, changes) =>
    set((state) => ({
      document: touch(applyNodeUpdate(state.document, id, changes)),
    })),

  updateEdge: (id, changes) =>
    set((state) =>
      withHistory(state, applyEdgeUpdate(state.document, id, changes)),
    ),

  updateEdgeTransient: (id, changes) =>
    set((state) => ({
      document: touch(applyEdgeUpdate(state.document, id, changes)),
    })),

  select: (selection) =>
    set((state) => ({
      selection,
      expandedInfoNodeId:
        selection?.kind === 'node' && selection.id === state.expandedInfoNodeId
          ? state.expandedInfoNodeId
          : null,
    })),

  toggleInfoNode: (id) =>
    set((state) => ({
      expandedInfoNodeId: state.expandedInfoNodeId === id ? null : id,
      selection: { kind: 'node', id },
    })),

  closeInfoNode: () => set({ expandedInfoNodeId: null }),

  deleteSelection: () =>
    set((state) => {
      if (!state.selection) return state;
      const document = cloneDocument(state.document);
      if (state.selection.kind === 'node') {
        document.nodes = document.nodes.filter(
          (node) => node.id !== state.selection?.id,
        );
        document.edges = document.edges.filter(
          (edge) =>
            edge.source !== state.selection?.id &&
            edge.target !== state.selection?.id,
        );
      } else {
        document.edges = document.edges.filter(
          (edge) => edge.id !== state.selection?.id,
        );
      }
      return {
        ...withHistory(state, document),
        selection: null,
        expandedInfoNodeId: null,
        transactionBase: null,
      };
    }),

  checkpoint: () =>
    set((state) => ({
      transactionBase: state.transactionBase ?? cloneDocument(state.document),
    })),

  beginTransaction: () =>
    set((state) => ({
      transactionBase: state.transactionBase ?? cloneDocument(state.document),
    })),

  commitTransaction: () =>
    set((state) => {
      if (!state.transactionBase) return state;
      const changed =
        documentContent(state.transactionBase) !==
        documentContent(state.document);
      return {
        transactionBase: null,
        ...(changed && {
          past: [
            ...state.past.slice(-49),
            cloneDocument(state.transactionBase),
          ],
          future: [],
        }),
      };
    }),

  cancelTransaction: () =>
    set((state) =>
      state.transactionBase
        ? {
            document: state.transactionBase,
            transactionBase: null,
          }
        : state,
    ),

  undo: () =>
    set((state) => {
      if (
        state.transactionBase &&
        documentContent(state.transactionBase) !==
          documentContent(state.document)
      ) {
        return {
          document: state.transactionBase,
          future: [cloneDocument(state.document), ...state.future].slice(0, 50),
          selection: null,
          expandedInfoNodeId: null,
          transactionBase: null,
        };
      }
      const previous = state.past.at(-1);
      if (!previous) return { transactionBase: null };
      return {
        document: previous,
        past: state.past.slice(0, -1),
        future: [cloneDocument(state.document), ...state.future].slice(0, 50),
        selection: null,
        expandedInfoNodeId: null,
        transactionBase: null,
      };
    }),

  redo: () =>
    set((state) => {
      const next = state.future[0];
      if (!next) return state;
      return {
        document: next,
        past: [...state.past.slice(-49), cloneDocument(state.document)],
        future: state.future.slice(1),
        selection: null,
        expandedInfoNodeId: null,
        transactionBase: null,
      };
    }),

  newDocument: () =>
    set({
      document: createArchitectureDocument(),
      selection: null,
      expandedInfoNodeId: null,
      past: [],
      future: [],
      transactionBase: null,
    }),

  hydrateDocument: (document) =>
    set({
      document: cloneDocument(document),
      selection: null,
      expandedInfoNodeId: null,
      past: [],
      future: [],
      transactionBase: null,
    }),

  replaceDocument: (document) => {
    const now = new Date().toISOString();
    set({
      document: {
        ...cloneDocument(document),
        id: `architecture-${crypto.randomUUID()}`,
        metadata: {
          ...document.metadata,
          name: `${document.metadata.name} (imported)`,
          createdAt: now,
          updatedAt: now,
        },
      },
      selection: null,
      expandedInfoNodeId: null,
      past: [],
      future: [],
      transactionBase: null,
    });
  },

  renameDocument: (name) =>
    set((state) => ({
      document: touch({
        ...state.document,
        metadata: { ...state.document.metadata, name },
      }),
    })),
}));
