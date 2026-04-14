// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

const makeJsonResponse = (payload) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => payload,
  });

beforeEach(() => {
  global.fetch = jest.fn((input) => {
    const url = String(input || "");

    if (url.includes("/api/report")) {
      return makeJsonResponse({
        title: "Incident report",
        executiveSummary: "Telemetry remains healthy in the mocked test environment.",
        impact: "No customer-facing degradation detected.",
        rootCause: "No active incident in mocked data.",
      });
    }

    if (url.includes("/api/prompt-studio")) {
      return makeJsonResponse({
        title: "Prompt pack",
        systemPrompt: "You are an incident commander.",
        userPrompt: "Summarize the current platform posture.",
        evaluationChecklist: ["Ground claims in telemetry"],
        suggestedAgents: [{ name: "SRE Agent", purpose: "Own reliability triage." }],
        source: "mock",
      });
    }

    if (url.includes("/api/copilot")) {
      return makeJsonResponse({
        headline: "Mock copilot response",
        summary: "The mocked environment is stable.",
        actions: ["Observe telemetry", "Validate alerts", "Review endpoint health"],
        source: "mock",
      });
    }

    if (url.includes("/api/query")) {
      return makeJsonResponse({
        title: "Telemetry query",
        answer: "The mocked endpoint data is healthy.",
        bullets: ["No 5xx spike detected", "Latency remains inside guardrails"],
      });
    }

    return makeJsonResponse({
      requests: [],
      sparkData: Array.from({ length: 12 }, (_, index) => ({
        second: `${index}`,
        rps: 0,
        latency: 0,
        p95: 0,
        p99: 0,
        errors: 0,
        twoXX: 0,
        fourXX: 0,
        fiveXX: 0,
      })),
      totals: {
        rollingCount: 0,
        avgLatency: 0,
        errorRate: 0,
        currentRps: 0,
        peakRps: 0,
        incidentCount: 0,
        healthScore: 100,
      },
      statusDist: [],
      methodDist: [],
      endpointRows: [],
      botSummary: [],
      rateLimitEvents: [],
      regionDist: [],
      serviceHealth: [],
      timeline: [],
      rootCauses: [],
      alertCenter: [],
      businessImpact: {
        summary: "No customer-facing issues detected.",
        statements: ["Test snapshot loaded successfully."],
      },
      capacity: {
        computeLoad: 18,
        cachePressure: 12,
        scalingRecommendation: "Current capacity comfortably supports load.",
      },
      threatIntel: [],
      roleBriefings: {},
      architecture: {
        Ingestion: ["Gateway"],
        Intelligence: ["AI Copilot"],
      },
      auditTrail: [],
      sla: {
        availability: 100,
        latencyBudgetUsed: 0,
        targetAvailability: 99.9,
        targetP95: 450,
      },
      threatScore: 5,
      scenario: "normal",
      scenarioLabel: "Normal Ops",
      topEndpoint: null,
      noisyEndpoint: null,
    });
  });

  class MockEventSource {
    constructor(url) {
      this.url = url;
      this.listeners = {};
    }

    addEventListener(type, callback) {
      this.listeners[type] = callback;
    }

    close() {}
  }

  global.EventSource = MockEventSource;
});

afterEach(() => {
  jest.clearAllMocks();
});
