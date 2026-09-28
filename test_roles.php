<?php
$roles = App\Models\Role::all(['id','name'])->pluck('name','id');
foreach($roles as $k => $v) { echo "$k: $v\n"; }