package dev.vant.tasks.erro;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(RecursoNaoEncontradoException.class)
    public ResponseEntity<ErroResponse> naoEncontrado(RecursoNaoEncontradoException excecao, HttpServletRequest requisicao) {
        return resposta(HttpStatus.NOT_FOUND, excecao.getMessage(), requisicao, null);
    }

    @ExceptionHandler(RegraDeNegocioException.class)
    public ResponseEntity<ErroResponse> regraDeNegocio(RegraDeNegocioException excecao, HttpServletRequest requisicao) {
        return resposta(HttpStatus.CONFLICT, excecao.getMessage(), requisicao, null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErroResponse> dadosInvalidos(MethodArgumentNotValidException excecao, HttpServletRequest requisicao) {
        Map<String, String> campos = new LinkedHashMap<>();
        excecao.getBindingResult().getFieldErrors()
                .forEach(erro -> campos.putIfAbsent(erro.getField(), erro.getDefaultMessage()));
        return resposta(HttpStatus.BAD_REQUEST, "Um ou mais campos estão inválidos.", requisicao, campos);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErroResponse> corpoIlegivel(HttpMessageNotReadableException excecao, HttpServletRequest requisicao) {
        return resposta(HttpStatus.BAD_REQUEST,
                "Corpo da requisição inválido ou com valor não reconhecido.", requisicao, null);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErroResponse> parametroInvalido(MethodArgumentTypeMismatchException excecao, HttpServletRequest requisicao) {
        return resposta(HttpStatus.BAD_REQUEST,
                "Parâmetro inválido: " + excecao.getName() + ".", requisicao, null);
    }

    private ResponseEntity<ErroResponse> resposta(HttpStatus status, String mensagem,
                                                  HttpServletRequest requisicao, Map<String, String> campos) {
        ErroResponse erro = new ErroResponse(
                Instant.now(), status.value(), mensagem, requisicao.getRequestURI(), campos);
        return ResponseEntity.status(status).body(erro);
    }
}
