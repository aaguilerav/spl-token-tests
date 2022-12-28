#!/usr/bin/env node

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var spl_token_1 = require("@solana/spl-token");
var web3_js_1 = require("@solana/web3.js");
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var connection, tokenAccounts;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                connection = new web3_js_1.Connection((0, web3_js_1.clusterApiUrl)('devnet'), 'confirmed');
                return [4 /*yield*/, connection.getTokenAccountsByOwner(new web3_js_1.PublicKey('BRKEvzr1ixfH4gGBGpdqkYKDgB66Rm6oDCyBax1qXLuJ'), {
                        programId: spl_token_1.TOKEN_PROGRAM_ID
                    })];
            case 1:
                tokenAccounts = _a.sent();
                console.log("Token                                         Balance");
                console.log("------------------------------------------------------------");
                tokenAccounts.value.forEach(function (tokenAccount) {
                    var accountData = spl_token_1.AccountLayout.decode(tokenAccount.account.data);
                    console.log("".concat(new web3_js_1.PublicKey(accountData.mint), "   ").concat(accountData.amount));
                });
                return [2 /*return*/];
        }
    });
}); })();
/*
Token                                         Balance
------------------------------------------------------------
7e2X5oeAAJyUTi4PfSGXFLGhyPw2H8oELm1mx87ZCgwF  84
AQoKYV7tYpTrFZN6P5oUufbQKAUr9mNYGe1TTJC9wajM  100
AQoKYV7tYpTrFZN6P5oUufbQKAUr9mNYGe1TTJC9wajM  0
AQoKYV7tYpTrFZN6P5oUufbQKAUr9mNYGe1TTJC9wajM  1
*/ 
