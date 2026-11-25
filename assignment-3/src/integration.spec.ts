import * as client from './client/client';
import Express from 'express';
import * as http from 'http';
import transcriptServer from './server/transcriptServer';
import { AddressInfo } from 'net';
import { setBaseURL } from './client/remoteService';
import * as db from './server/transcriptManager';

/**
 * Tests for the Transcript Manager. This test suite automatically deploys a local testing server
 * and cleans it up when it's done. Each test is hermetic, as the datastore is cleared before each
 * test runs.
 */
describe('TranscriptManager', () => {
  // The server instance, once deployed for testing purposes
  let server: http.Server;
  let responseStatus: number;

  // Set up the server once before all tests run
  beforeAll(async () => {
    // Deploy a testing server
    const app = Express();
    // The client returns only the body, so record the status of each real response.
    app.use((_req, res, next) => {
      res.on('finish', () => { responseStatus = res.statusCode; });
      next();
    });
    server = http.createServer(app);

    // Add the transcript server's routes to the express server
    transcriptServer(app);

    db.initialize();

    // Start the server on a random, free port, then fetch that address and configure the client to use that server.
    await new Promise<void>((resolve, reject) => {
      server.listen(0, () => resolve());
      server.on('error', reject);
    });
    const address = server.address() as AddressInfo;
    setBaseURL(`http://localhost:${address.port}`);
  });

  // Tear down the server once all tests are done
  afterAll(async () => {
    // After all tests are done, shut down the server to avoid any resource leaks
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  });

  // Clear the datastore before each test to ensure hermetic tests
  beforeEach(() => {
    // Before any test runs, clean up the datastore. This should ensure that tests are hermetic.
    db.initialize();
  });

  // Example test. Replace the todos below with the required tests.
  it('addStudent() returns an ID through the HTTP API', async () => {
    const createdStudent = await client.addStudent('Aziza');
    expect(createdStudent.studentID).toBeGreaterThan(4);
  });

  it('POST /transcripts returns 201 and an ID for a valid name', async () => {
    const result = await client.addStudent('Aziza');
    expect(responseStatus).toBe(201);
    expect(typeof result.studentID).toBe('number');
    expect(result.studentID).toBeGreaterThan(0);
    await expect(client.getStudentIDs('Aziza')).resolves.toContain(result.studentID);
  });

  it('POST /transcripts returns 400 when the name is missing or empty', async () => {
    await expect(client.addStudent('')).rejects.toThrow(/400/);
    expect(responseStatus).toBe(400);
  });

  it('GET /transcripts/:id returns 200 for a valid ID and 404 for a missing one', async () => {
    const { studentID } = await client.addStudent('Aziza');
    await expect(client.getTranscript(studentID)).resolves.toEqual({
      student: { studentID, studentName: 'Aziza' },
      grades: [],
    });
    expect(responseStatus).toBe(200);
    await expect(client.getTranscript(9999)).rejects.toThrow(/404/);
    expect(responseStatus).toBe(404);
  });

  it('GET /studentids?name=... returns all IDs for that name', async () => {
    const first = await client.addStudent('Aziza');
    const second = await client.addStudent('Aziza');
    const ids = await client.getStudentIDs('Aziza');
    expect(ids).toHaveLength(2);
    expect(ids).toEqual(expect.arrayContaining([first.studentID, second.studentID]));
  });

  it('DELETE /transcripts/:id returns 204 and actually deletes the student', async () => {
    const { studentID } = await client.addStudent('Aziza');
    await client.deleteStudent(studentID);
    expect(responseStatus).toBe(204);
    await expect(client.getStudentIDs('Aziza')).resolves.not.toContain(studentID);
    await expect(client.getTranscript(studentID)).rejects.toThrow(/404/);
  });

  it('POST /transcripts/:studentID/:course returns 201 and rejects duplicates or bad grades', async () => {
    const { studentID } = await client.addStudent('Aziza');
    await client.addGrade(studentID, 'CS360', 95);
    expect(responseStatus).toBe(201);
    await expect(client.addGrade(studentID, 'CS360', 90)).rejects.toThrow(/400/);
    expect(responseStatus).toBe(400);
    // Cast only to send the deliberately invalid grade required by this test.
    await expect(client.addGrade(studentID, 'CS411', '' as unknown as number)).rejects.toThrow(/400/);
    expect(responseStatus).toBe(400);
  });

  it('GET /transcripts/:studentID/:course returns the grade object', async () => {
    const { studentID } = await client.addStudent('Aziza');
    await client.addGrade(studentID, 'CS360', 95);
    await expect(client.getGrade(studentID, 'CS360')).resolves.toEqual({
      studentID, course: 'CS360', grade: 95,
    });
    expect(responseStatus).toBe(200);
  });
});
