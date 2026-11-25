import * as db from './transcriptManager';

describe('transcriptManager unit tests', () => {
  beforeEach(() => {
    db.initialize();
  });

  // Example test. Replace the todos below with the required tests.
  it('initialize() creates the four sample students', () => {
    expect(db.getAll()).toHaveLength(4);
  });

  it('addStudent() returns a numeric ID and stores the student', () => {
    const id = db.addStudent('Aziza');
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
    expect(db.getStudentIDs('Aziza')).toContain(id);
    expect(db.getTranscript(id)).toEqual({
      student: { studentID: id, studentName: 'Aziza' },
      grades: [],
    });
  });

  it('different students get different IDs, even with the same name', () => {
    const first = db.addStudent('Aziza');
    const second = db.addStudent('Aziza');
    expect(first).not.toBe(second);
    expect(db.getStudentIDs('Aziza')).toEqual(expect.arrayContaining([first, second]));
  });

  it('getTranscript() returns undefined for a missing ID', () => {
    expect(db.getTranscript(9999)).toBeUndefined();
  });

  it('deleteStudent() removes only the requested student and throws for a missing one', () => {
    const first = db.addStudent('Aziza');
    const second = db.addStudent('Aziza');
    const originalIDs = db.getAll().map(t => t.student.studentID);
    db.deleteStudent(first);
    expect(db.getAll().map(t => t.student.studentID)).toEqual(originalIDs.filter(id => id !== first));
    expect(db.getStudentIDs('Aziza')).toEqual([second]);
    expect(db.getTranscript(first)).toBeUndefined();
    expect(() => db.deleteStudent(first)).toThrow();
  });

  it('addGrade() adds a grade and rejects a duplicate course', () => {
    const id = db.addStudent('Aziza');
    db.addGrade(id, 'CS360', 95);
    db.addGrade(id, 'CS411', 85);
    expect(db.getTranscript(id)?.grades).toEqual([
      { course: 'CS360', grade: 95 },
      { course: 'CS411', grade: 85 },
    ]);
    expect(() => db.addGrade(id, 'CS360', 90)).toThrow();
  });

  it('getGrade() returns the grade and throws for a missing student or course', () => {
    const id = db.addStudent('Aziza');
    db.addGrade(id, 'CS360', 95);
    expect(db.getGrade(id, 'CS360')).toBe(95);
    expect(() => db.getGrade(id, 'CS411')).toThrow();
    expect(() => db.getGrade(9999, 'CS360')).toThrow();
  });
});
