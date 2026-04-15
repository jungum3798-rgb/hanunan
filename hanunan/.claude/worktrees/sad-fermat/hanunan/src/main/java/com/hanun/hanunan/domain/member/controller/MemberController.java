package com.hanun.hanunan.domain.member.controller;

import com.hanun.hanunan.domain.member.dto.MemberCreateDto;
import com.hanun.hanunan.domain.M.dto.MemberLoginDto;

import com.hanun.hanunan.domain.member.entity.Member;
import com.hanun.hanunan.domain.member.service.MemberService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/member")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @PostMapping("/create")
    public ResponseEntity<?> memberCreate(@RequestBody MemberCreateDto memberCreateDto){
        Member member = memberService.create(memberCreateDto);
        return new ResponseEntity<>(member.getId(), HttpStatus.CREATED);
    }

    @PostMapping("/dologin")
    public ResponseEntity<?> doLogin(@RequestBody MemberLoginDto memberLoginDto){
    //  email, password 일치한지 검증
        Member member = memberService.login(memberLoginDto); //로그인 메서드 검증은 로그인 메서드에서 처리

    //  일치할 경우 jwt accesstoken 생성


    }

}
