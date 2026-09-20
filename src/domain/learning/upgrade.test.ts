import { describe, it, expect } from 'vitest';
import { calculateCapacity } from './worksheet';
import { createUrlShortener } from './urlShortener';
import { parseArchitectureDocument } from '../architecture/schema';
import { evaluateRubric } from './evaluation';
import { learningRubrics, learningLessons, learningConcepts } from './structuredContent';

describe('upgrade contracts', () => {
  it('uses only writes for five-year retained replicated storage and separates bandwidth', () => {
    const worksheet = { activeUsers: 86400, actionsPerUserPerDay: 19200, readPercent: 19000 / 19200 * 100, averagePayloadKB: 0.5, storedRecordBytes: 500, retentionDays: 1825, replicationFactor: 3, peakMultiplier: 1 };
    const estimate = calculateCapacity(worksheet);
    expect(estimate.averageReadRps).toBe(19000);
    expect(estimate.averageWriteRps).toBe(200);
    expect(estimate.writeRecordsPerDay).toBe(17280000);
    expect(estimate.retainedStorageGB).toBeCloseTo(17280000 * 500 * 1825 * 3 / 1073741824, 2);
    expect(calculateCapacity({ ...worksheet, readPercent: 100 }).dailyStorageGB).toBe(0);
    expect(calculateCapacity({ ...worksheet, readPercent: 100 }).monthlyTrafficGB).toBe(estimate.monthlyTrafficGB);
  });
  it.each(['1.0','1.1','1.2','1.3','1.4'])('migrates %s without changing identity', schemaVersion => {
    const original = createUrlShortener(false);
    const migrated = parseArchitectureDocument({ ...original, schemaVersion });
    expect(migrated.schemaVersion).toBe('1.5');
    expect(migrated.id).toBe(original.id);
    expect(migrated.nodes.map(node => node.id)).toEqual(original.nodes.map(node => node.id));
  });
  it('round-trips classified traffic and generator controls', () => {
    const doc = createUrlShortener(true);
    expect(parseArchitectureDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
    const key = doc.nodes.find(node => node.data.config.applicationRole === 'id-generator')!;
    key.data.config.idKeyLength = 0;
    expect(() => parseArchitectureDocument(doc)).toThrow();
  });
  it('has fifteen connected learning concepts and topology-independent evidence', () => {
    const lesson = learningLessons.find(entry => entry.id === 'url-shortener-design')!;
    expect(lesson.conceptIds).toHaveLength(15);
    expect(lesson.conceptIds.every(id => learningConcepts.some(concept => concept.id === id))).toBe(true);
    const rubric = learningRubrics.find(entry => entry.id === 'url-shortener-rubric')!;
    const doc = createUrlShortener(true);
    const before = evaluateRubric(rubric, doc, []);
    expect(before.slice(0,3).every(entry => entry.state === 'observed')).toBe(true);
    expect(before.slice(3).every(entry => entry.state === 'not-represented')).toBe(true);
    doc.nodes.reverse().forEach((node,index) => node.position = {x:index * -100,y:2000});
    expect(evaluateRubric(rubric,doc,[])).toEqual(before);
    doc.edges.filter(edge => doc.nodes.find(node => node.id === edge.source)?.type === 'cache').forEach(edge => edge.config.disabled = true);
    expect(evaluateRubric(rubric,doc,[])[0].state).toBe('not-represented');
  });
});
