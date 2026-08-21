<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect('/app'));

Route::get('/app/{any}', fn () => response()->file(public_path('app/index.html')))
    ->where('any', '.*');
