# External bundle runtime services

Status: implemented

## Problem

The initial bundle mounted a `dsh-observer/invariant` companion copied from the in-repository package convention. A published DeepSeek Harness Web profile installs the invariants package but does not mount its `invariants` service. The companion therefore remained pending and the activation audit rejected the whole plugin tree.

## Decision

The out-of-tree bundle mounts only the Observer Host plugin. It does not export or mount an invariant companion and does not introduce a global invariants provider. Observer's required runtime relationship is the public `sessionProjections` service declared by its Host plugin.

## Consequences

The bundle activates in the published Web profile without changing the profile's global diagnostic services. Repository-internal invariant companions remain an in-tree package governance mechanism rather than an external plugin installation requirement.
