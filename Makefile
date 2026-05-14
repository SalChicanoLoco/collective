.PHONY: check cleanup-gate

check:
	python3 scripts/agent_check.py

cleanup-gate:
	bash scripts/cleanup_gate.sh
