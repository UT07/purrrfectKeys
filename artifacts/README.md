# Detox Simulator Build Artifacts

Place EAS-built .app files here for Detox testing.

```bash
# Build on EAS:
eas build --profile preview-simulator

# Download the .tar.gz from EAS dashboard, then:
tar -xzf build-*.tar.gz -C artifacts/

# Run Detox tests:
npx detox test -c ios.sim.eas
```
