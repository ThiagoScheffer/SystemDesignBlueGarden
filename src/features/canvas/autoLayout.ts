type LayoutNode = { id: string; width?: number; height?: number };
type LayoutEdge = { source: string; target: string };

/** Stable layered layout: strongly connected nodes share a column. */
export function autoLayout(nodes: LayoutNode[], edges: LayoutEdge[]) {
  const neighbors = new Map(nodes.map((n) => [n.id, new Set<string>()]));
  for (const e of edges)
    if (neighbors.has(e.source) && neighbors.has(e.target)) {
      neighbors.get(e.source)!.add(e.target);
      neighbors.get(e.target)!.add(e.source);
    }
  const remaining = new Set(nodes.map((n) => n.id).sort()),
    components: string[][] = [];
  while (remaining.size) {
    const queue = [remaining.values().next().value!],
      group: string[] = [];
    remaining.delete(queue[0]);
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      group.push(id);
      for (const next of neighbors.get(id)!)
        if (remaining.delete(next)) queue.push(next);
    }
    components.push(group);
  }
  if (components.length > 1) {
    const result: Record<string, { x: number; y: number }> = {};
    let offset = 0;
    for (const group of components) {
      const subset = nodes.filter((n) => group.includes(n.id));
      const positions = autoLayout(
        subset,
        edges.filter(
          (e) => group.includes(e.source) && group.includes(e.target),
        ),
      );
      for (const n of subset)
        result[n.id] = { x: positions[n.id].x, y: positions[n.id].y + offset };
      offset +=
        Math.max(...subset.map((n) => positions[n.id].y + (n.height || 100))) +
        60;
    }
    return result;
  }
  const ids = nodes.map((n) => n.id).sort();
  const adjacency = new Map(ids.map((id) => [id, new Set<string>()]));
  for (const edge of edges)
    if (adjacency.has(edge.source) && adjacency.has(edge.target))
      adjacency.get(edge.source)!.add(edge.target);
  let index = 0;
  const indices = new Map<string, number>(),
    low = new Map<string, number>();
  const stack: string[] = [],
    active = new Set<string>(),
    groups: string[][] = [];
  function visit(id: string) {
    indices.set(id, index);
    low.set(id, index++);
    stack.push(id);
    active.add(id);
    for (const next of [...adjacency.get(id)!].sort()) {
      if (!indices.has(next)) {
        visit(next);
        low.set(id, Math.min(low.get(id)!, low.get(next)!));
      } else if (active.has(next))
        low.set(id, Math.min(low.get(id)!, indices.get(next)!));
    }
    if (low.get(id) === indices.get(id)) {
      const group: string[] = [];
      let next: string;
      do {
        next = stack.pop()!;
        active.delete(next);
        group.push(next);
      } while (next !== id);
      groups.push(group.sort());
    }
  }
  ids.forEach((id) => {
    if (!indices.has(id)) visit(id);
  });
  const owner = new Map(
    groups.flatMap((group, i) => group.map((id) => [id, i] as const)),
  );
  const rank = new Map<number, number>();
  function level(group: number): number {
    if (rank.has(group)) return rank.get(group)!;
    let value = 0;
    for (const edge of edges)
      if (
        owner.get(edge.target) === group &&
        owner.has(edge.source) &&
        owner.get(edge.source) !== group
      )
        value = Math.max(value, level(owner.get(edge.source)!) + 1);
    rank.set(group, value);
    return value;
  }
  groups.forEach((_, i) => level(i));
  const columns = new Map<number, string[]>();
  ids.forEach((id) => {
    const r = rank.get(owner.get(id)!)!;
    columns.set(r, [...(columns.get(r) || []), id]);
  });
  const sizes = new Map(nodes.map((n) => [n.id, n]));
  const positions: Record<string, { x: number; y: number }> = {};
  let x = 40;
  for (const [, column] of [...columns].sort((a, b) => a[0] - b[0])) {
    let y = 40;
    for (const id of column) {
      positions[id] = { x, y };
      y += (sizes.get(id)?.height || 100) + 60;
    }
    x += Math.max(...column.map((id) => sizes.get(id)?.width || 220)) + 100;
  }
  return positions;
}
