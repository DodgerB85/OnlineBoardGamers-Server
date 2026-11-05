#!/bin/sh
# lbr-policy is a static Linux build; run it under WSL. Django passes Windows
# paths, so translate any that appear (in practice the --net model path).
dir=$(dirname "$0")
n=$#
i=0
while [ "$i" -lt "$n" ]; do
    arg=$1
    shift
    case "$arg" in
        [A-Za-z]:[\\/]*)
            arg=$(wslpath -u "$arg")
            ;;
    esac
    set -- "$@" "$arg"
    i=$((i + 1))
done
exec "$dir/lbr-policy" "$@"
