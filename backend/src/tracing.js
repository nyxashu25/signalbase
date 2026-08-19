// Must be loaded BEFORE any other module (see the `--import` flag on the
// dev/start/worker scripts in package.json) — auto-instrumentation works by
// monkey-patching modules (http, express, pg, ioredis, ...) at require/
// import time, so it has to run before those modules are first loaded
// anywhere else in the app.
//
// Every OpenTelemetry/Prisma instrumentation package here is CommonJS.
// Under Node's native ESM loader, only the default export is reliably
// available — named exports (as shown in most of these packages' own docs,
// written for CJS/bundler consumers) intermittently fail with
// "Named export 'X' not found", so every import below goes through the
// default-export + destructure pattern rather than a named import.
import sdkNodePkg from '@opentelemetry/sdk-node';
import autoInstrumentationsPkg from '@opentelemetry/auto-instrumentations-node';
import prismaInstrumentationPkg from '@prisma/instrumentation';
import otlpExporterPkg from '@opentelemetry/exporter-trace-otlp-http';
import sdkTraceNodePkg from '@opentelemetry/sdk-trace-node';
import resourcesPkg from '@opentelemetry/resources';
import semanticConventionsPkg from '@opentelemetry/semantic-conventions';

const { NodeSDK } = sdkNodePkg;
const { getNodeAutoInstrumentations } = autoInstrumentationsPkg;
const { PrismaInstrumentation } = prismaInstrumentationPkg;
const { OTLPTraceExporter } = otlpExporterPkg;
const { ConsoleSpanExporter } = sdkTraceNodePkg;
const { Resource } = resourcesPkg;
const { ATTR_SERVICE_NAME } = semanticConventionsPkg;

// Real deployments set OTEL_EXPORTER_OTLP_ENDPOINT to point at a collector
// (Jaeger, Tempo, Honeycomb, ...) — standard OpenTelemetry env var, no code
// change needed to switch targets. Without it, spans print to the console,
// which is what makes the async paths (reveal, sequence tick) inspectable
// locally without standing up a full tracing backend.
const exporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  ? new OTLPTraceExporter()
  : new ConsoleSpanExporter();

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'datapit-backend',
  }),
  traceExporter: exporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Health checks and the metrics scrape endpoint itself would just be
      // noise on every single request — skip them.
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (req) => req.url === '/health' || req.url === '/metrics',
      },
      // Traces every fs call, including Node's own module resolution at
      // startup — hundreds of thousands of spans with zero diagnostic
      // value for this app's actual async paths. A well-known thing to
      // turn off in practice, not specific to this codebase.
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
    new PrismaInstrumentation(),
  ],
});

sdk.start();

const shutdown = () => sdk.shutdown().finally(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
