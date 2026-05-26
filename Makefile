.PHONY: check cleanup-gate checksums

check:
	python3 scripts/agent_check.py

cleanup-gate:
	bash scripts/cleanup_gate.sh

checksums:
	bash scripts/generate_checksums.sh
