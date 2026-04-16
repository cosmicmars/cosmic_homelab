.PHONY: all install frontend-install frontend-build package package-all package-mac package-linux package-win clean

all: install frontend-install frontend-build package-all

install:
	@echo "Installing Python requirements..."
	python3 -m pip install --user -r requirements.txt

frontend-install:
	@echo "Installing frontend dependencies..."
	cd cosmic-frontend && npm ci

frontend-build:
	@echo "Building frontend (Vite)..."
	cd cosmic-frontend && npm run build


package: frontend-build
	@echo "Packaging Electron app for current platform..."
	cd cosmic-frontend && npx electron-builder --projectDir .

package-all: frontend-build
	@echo "Packaging Electron app for mac, linux and win (may require extra tools)..."
	@echo "Note: Building Windows targets on macOS may require Wine/Mono."
	cd cosmic-frontend && npx electron-builder --projectDir . --mac --linux --win

package-mac: frontend-build
	@echo "Packaging mac..."
	cd cosmic-frontend && npx electron-builder --projectDir . --mac

package-linux: frontend-build
	@echo "Packaging linux..."
	cd cosmic-frontend && npx electron-builder --projectDir . --linux

package-win: frontend-build
	@echo "Packaging windows (requires Wine on macOS)..."
	cd cosmic-frontend && npx electron-builder --projectDir . --win

clean:
	@echo "Cleaning build artifacts..."
	rm -rf cosmic-frontend/dist dist_electron
